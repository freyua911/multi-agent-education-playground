#!/usr/bin/env python3
"""
从对话记录JSON中提取数据，按时间戳整理
"""

import json
import os
from datetime import datetime
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_FILE = os.path.join(BASE_DIR, 'public', 'data', 'conversation_logs_rows.json')
OUTPUT_FILE = os.path.join(BASE_DIR, 'public', 'data', 'conversation_logs_formatted.json')

def parse_timestamp(ts_str):
    """解析时间戳"""
    try:
        # 处理ISO格式时间戳
        if ts_str.endswith('Z'):
            ts_str = ts_str[:-1] + '+00:00'
        return datetime.fromisoformat(ts_str)
    except:
        return None

def extract_conversation_data():
    """提取并整理对话数据"""
    print("Loading conversation logs...")
    
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
    except Exception as e:
        print(f"Error loading file: {e}")
        return
    
    print(f"Found {len(raw_data)} records")
    
    # 按用户组织数据
    user_conversations = defaultdict(list)
    
    for record in raw_data:
        user_id = record.get('user_id')
        if not user_id:
            continue
        
        payload_str = record.get('payload', '{}')
        try:
            payload = json.loads(payload_str)
        except:
            # 如果解析失败，尝试逐条处理
            continue
        
        # 提取基本信息
        total_turns = payload.get('totalTurns', 0)
        test_history = payload.get('testHistory', [])
        feedback_history = payload.get('feedbackHistory', [])
        
        # 按时间戳排序的消息列表
        messages = []
        
        # 处理testHistory
        for msg in test_history:
            timestamp_str = msg.get('timestamp', '')
            timestamp = parse_timestamp(timestamp_str) if timestamp_str else None
            
            messages.append({
                'timestamp': timestamp_str,
                'parsed_timestamp': timestamp.isoformat() if timestamp else None,
                'role': msg.get('role', ''),
                'type': msg.get('type', ''),
                'speaker': msg.get('speaker', ''),
                'content': msg.get('content', '')[:100] + '...' if len(msg.get('content', '')) > 100 else msg.get('content', ''),
                'content_length': len(msg.get('content', ''))
            })
        
        # 处理feedbackHistory
        for feedback in feedback_history:
            timestamp_str = feedback.get('timestamp', '')
            timestamp = parse_timestamp(timestamp_str) if timestamp_str else None
            
            messages.append({
                'timestamp': timestamp_str,
                'parsed_timestamp': timestamp.isoformat() if timestamp else None,
                'role': 'feedback',
                'type': 'feedback',
                'speaker': 'Feedback Agent',
                'task_level': feedback.get('taskLevel', ''),
                'task_name': feedback.get('taskName', ''),
                'score': feedback.get('score', 0),
                'summary': feedback.get('summary', '')[:100] + '...' if len(feedback.get('summary', '')) > 100 else feedback.get('summary', '')
            })
        
        # 按时间戳排序
        messages.sort(key=lambda x: x.get('parsed_timestamp', '') or '')
        
        # 计算会话时长
        if messages:
            first_msg = messages[0]
            last_msg = messages[-1]
            first_ts = parse_timestamp(first_msg.get('timestamp', ''))
            last_ts = parse_timestamp(last_msg.get('timestamp', ''))
            
            if first_ts and last_ts:
                duration_seconds = (last_ts - first_ts).total_seconds()
                duration_minutes = duration_seconds / 60
            else:
                duration_minutes = 0
        else:
            duration_minutes = 0
        
        # 统计角色使用
        teacher_turns = sum(1 for m in messages if m.get('speaker') == '考官' or (m.get('role') == 'assistant' and m.get('speaker') != '反馈 Agent'))
        peer_turns = sum(1 for m in messages if m.get('speaker') == '反馈 Agent' or m.get('role') == 'feedback')
        user_turns = sum(1 for m in messages if m.get('role') == 'user')
        
        # 统计角色切换
        role_switches = 0
        last_role = None
        for msg in messages:
            current_role = None
            speaker = msg.get('speaker', '')
            role = msg.get('role', '')
            
            if speaker == '考官' or (role == 'assistant' and speaker != '反馈 Agent'):
                current_role = 'teacher'
            elif speaker == '反馈 Agent' or role == 'feedback':
                current_role = 'peer'
            elif role == 'user':
                current_role = 'user'
            
            if current_role and current_role != last_role and last_role is not None:
                role_switches += 1
            
            if current_role:
                last_role = current_role
        
        # 提取Bloom得分
        bloom_scores = {}
        for feedback in feedback_history:
            task_level = feedback.get('taskLevel', '').lower()
            score = feedback.get('score', 0)
            if task_level:
                bloom_scores[task_level] = score
        
        conversation_summary = {
            'user_id': user_id,
            'record_id': record.get('id', ''),
            'created_at': record.get('created_at', ''),
            'total_turns': total_turns,
            'session_duration_minutes': round(duration_minutes, 2),
            'teacher_turns': teacher_turns,
            'peer_turns': peer_turns,
            'user_turns': user_turns,
            'role_switches': role_switches,
            'bloom_scores': bloom_scores,
            'message_count': len(messages),
            'first_message_time': messages[0].get('timestamp', '') if messages else '',
            'last_message_time': messages[-1].get('timestamp', '') if messages else '',
            'messages': messages[:50]  # 只保留前50条消息，避免文件过大
        }
        
        user_conversations[user_id].append(conversation_summary)
    
    # 整理输出格式
    output_data = []
    for user_id, conversations in user_conversations.items():
        # 为每个用户合并所有会话
        total_turns_all = sum(c['total_turns'] for c in conversations)
        total_duration = sum(c['session_duration_minutes'] for c in conversations)
        total_teacher = sum(c['teacher_turns'] for c in conversations)
        total_peer = sum(c['peer_turns'] for c in conversations)
        total_user = sum(c['user_turns'] for c in conversations)
        total_switches = sum(c['role_switches'] for c in conversations)
        
        # 合并Bloom得分（取平均值）
        bloom_combined = {}
        for conv in conversations:
            for level, score in conv['bloom_scores'].items():
                if level in bloom_combined:
                    bloom_combined[level] = (bloom_combined[level] + score) / 2
                else:
                    bloom_combined[level] = score
        
        user_summary = {
            'user_id': user_id,
            'session_count': len(conversations),
            'total_turns': total_turns_all,
            'total_duration_minutes': round(total_duration, 2),
            'teacher_turns': total_teacher,
            'peer_turns': total_peer,
            'user_turns': total_user,
            'role_switches': total_switches,
            'bloom_scores': bloom_combined,
            'sessions': conversations
        }
        
        output_data.append(user_summary)
    
    # 保存格式化后的数据
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\nExtracted data for {len(output_data)} users")
    print(f"Formatted data saved to: {OUTPUT_FILE}")
    
    # 打印摘要
    print("\n=== Summary ===")
    for user_data in output_data:
        print(f"\nUser: {user_data['user_id']}")
        print(f"  Sessions: {user_data['session_count']}")
        print(f"  Total Turns: {user_data['total_turns']}")
        print(f"  Duration: {user_data['total_duration_minutes']} minutes")
        print(f"  Teacher Turns: {user_data['teacher_turns']}")
        print(f"  Peer Turns: {user_data['peer_turns']}")
        print(f"  Role Switches: {user_data['role_switches']}")
        print(f"  Bloom Scores: {user_data['bloom_scores']}")

if __name__ == '__main__':
    extract_conversation_data()

