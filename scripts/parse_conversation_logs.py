#!/usr/bin/env python3
"""
解析对话记录JSON文件，按时间戳整理，生成便于阅读的格式
处理JSON格式问题
"""

import json
import os
import re
from datetime import datetime
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_FILE = os.path.join(BASE_DIR, 'public', 'data', 'conversation_logs_rows.json')
OUTPUT_FILE = os.path.join(BASE_DIR, 'public', 'data', 'conversation_logs_parsed.json')
CSV_OUTPUT = os.path.join(BASE_DIR, 'public', 'data', 'conversation_logs_extracted.csv')

def parse_timestamp(ts_str):
    """解析时间戳"""
    if not ts_str:
        return None
    try:
        # 处理ISO格式时间戳
        ts_str = ts_str.replace('Z', '+00:00')
        return datetime.fromisoformat(ts_str)
    except Exception as e:
        print(f"Error parsing timestamp {ts_str}: {e}")
        return None

def safe_json_loads(text):
    """安全地解析JSON，处理格式问题"""
    if not text or text == '{}':
        return {}
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        # 尝试修复常见的JSON问题
        # 查找并修复未转义的换行符（在字符串值中）
        # 这是一个简化的修复，可能不适用于所有情况
        try:
            # 尝试使用eval作为最后手段（不安全，但可以处理一些格式问题）
            import ast
            # 先尝试用ast.literal_eval
            return ast.literal_eval(text)
        except:
            print(f"Warning: Could not parse JSON, error: {e}")
            print(f"First 500 chars: {text[:500]}")
            return None

def extract_messages_from_payload(payload_str):
    """从payload字符串中提取消息"""
    messages = []
    
    # 尝试直接解析
    payload = safe_json_loads(payload_str)
    if not payload:
        return messages
    
    # 提取testHistory
    test_history = payload.get('testHistory', [])
    for msg in test_history:
        timestamp_str = msg.get('timestamp', '')
        timestamp = parse_timestamp(timestamp_str)
        
        messages.append({
            'timestamp': timestamp_str,
            'parsed_timestamp': timestamp.isoformat() if timestamp else None,
            'timestamp_obj': timestamp,
            'role': msg.get('role', ''),
            'type': msg.get('type', ''),
            'speaker': msg.get('speaker', ''),
            'content': msg.get('content', ''),
            'content_length': len(msg.get('content', ''))
        })
    
    # 提取feedbackHistory
    feedback_history = payload.get('feedbackHistory', [])
    for feedback in feedback_history:
        timestamp_str = feedback.get('timestamp', '')
        timestamp = parse_timestamp(timestamp_str)
        
        messages.append({
            'timestamp': timestamp_str,
            'parsed_timestamp': timestamp.isoformat() if timestamp else None,
            'timestamp_obj': timestamp,
            'role': 'feedback',
            'type': 'feedback',
            'speaker': 'Feedback Agent',
            'task_level': feedback.get('taskLevel', ''),
            'task_name': feedback.get('taskName', ''),
            'score': feedback.get('score', 0),
            'summary': feedback.get('summary', '')
        })
    
    return messages

def parse_conversation_logs():
    """解析对话记录"""
    print("Loading conversation logs...")
    
    # 尝试读取JSON文件
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return
    
    # 尝试解析JSON
    try:
        raw_data = json.loads(content)
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        print("Attempting to parse as array of JSON objects...")
        
        # 尝试逐行解析
        lines = content.strip().split('\n')
        raw_data = []
        for line in lines:
            line = line.strip()
            if line.startswith('[') or line.startswith(']'):
                continue
            if line.endswith(','):
                line = line[:-1]
            try:
                obj = json.loads(line)
                raw_data.append(obj)
            except:
                continue
    
    print(f"Found {len(raw_data)} records")
    
    # 按用户组织数据
    user_conversations = defaultdict(list)
    csv_rows = []
    
    for idx, record in enumerate(raw_data):
        user_id = record.get('user_id')
        if not user_id:
            continue
        
        payload_str = record.get('payload', '{}')
        
        # 提取消息
        messages = extract_messages_from_payload(payload_str)
        
        if not messages:
            continue
        
        # 按时间戳排序
        messages.sort(key=lambda x: x.get('timestamp_obj') or datetime.min)
        
        # 计算会话时长
        first_ts = messages[0].get('timestamp_obj')
        last_ts = messages[-1].get('timestamp_obj')
        
        if first_ts and last_ts:
            duration_seconds = (last_ts - first_ts).total_seconds()
            duration_minutes = duration_seconds / 60
        else:
            duration_minutes = 0
        
        # 统计角色使用
        teacher_turns = sum(1 for m in messages 
                          if m.get('speaker') == '考官' or 
                          (m.get('role') == 'assistant' and m.get('speaker') != '反馈 Agent'))
        peer_turns = sum(1 for m in messages 
                        if m.get('speaker') == '反馈 Agent' or m.get('role') == 'feedback')
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
        for msg in messages:
            if msg.get('type') == 'feedback':
                task_level = msg.get('task_level', '').lower()
                score = msg.get('score', 0)
                if task_level:
                    bloom_scores[task_level] = score
        
        # 创建会话摘要
        conversation_summary = {
            'user_id': user_id,
            'record_id': record.get('id', f'record_{idx}'),
            'created_at': record.get('created_at', ''),
            'total_turns': len(messages),
            'session_duration_minutes': round(duration_minutes, 2),
            'teacher_turns': teacher_turns,
            'peer_turns': peer_turns,
            'user_turns': user_turns,
            'role_switches': role_switches,
            'bloom_scores': bloom_scores,
            'message_count': len(messages),
            'first_message_time': messages[0].get('timestamp', '') if messages else '',
            'last_message_time': messages[-1].get('timestamp', '') if messages else '',
            'messages': messages  # 保留所有消息
        }
        
        user_conversations[user_id].append(conversation_summary)
        
        # CSV行数据
        csv_rows.append({
            'user_id': user_id,
            'record_id': conversation_summary['record_id'],
            'total_turns': conversation_summary['total_turns'],
            'duration_minutes': conversation_summary['session_duration_minutes'],
            'teacher_turns': teacher_turns,
            'peer_turns': peer_turns,
            'user_turns': user_turns,
            'role_switches': role_switches,
            'bloom_remember': bloom_scores.get('remember', ''),
            'bloom_understand': bloom_scores.get('understand', ''),
            'bloom_apply': bloom_scores.get('apply', ''),
            'bloom_analyze': bloom_scores.get('analyze', ''),
            'bloom_evaluate': bloom_scores.get('evaluate', ''),
            'bloom_create': bloom_scores.get('create', ''),
            'first_message_time': conversation_summary['first_message_time'],
            'last_message_time': conversation_summary['last_message_time']
        })
    
    # 整理输出格式
    output_data = []
    for user_id, conversations in user_conversations.items():
        # 合并所有会话
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
    
    # 保存JSON格式
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2, default=str)
    
    # 保存CSV格式
    import csv
    if csv_rows:
        with open(CSV_OUTPUT, 'w', newline='', encoding='utf-8-sig') as f:
            fieldnames = ['user_id', 'record_id', 'total_turns', 'duration_minutes',
                         'teacher_turns', 'peer_turns', 'user_turns', 'role_switches',
                         'bloom_remember', 'bloom_understand', 'bloom_apply',
                         'bloom_analyze', 'bloom_evaluate', 'bloom_create',
                         'first_message_time', 'last_message_time']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(csv_rows)
    
    print(f"\nExtracted data for {len(output_data)} users")
    print(f"JSON saved to: {OUTPUT_FILE}")
    print(f"CSV saved to: {CSV_OUTPUT}")
    
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
    parse_conversation_logs()

