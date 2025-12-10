#!/usr/bin/env python3
"""
数据提取和分析脚本
从pretest、posttest和conversation_logs中提取数据并生成汇总表
"""

import json
import os
from collections import defaultdict
from datetime import datetime
import csv

# 文件路径
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRETEST_FILE = os.path.join(BASE_DIR, 'public', 'data', 'pretest_responses_rows.json')
POSTTEST_FILE = os.path.join(BASE_DIR, 'public', 'data', 'posttest_responses_rows.json')
CONVERSATION_FILE = os.path.join(BASE_DIR, 'public', 'data', 'conversation_logs_rows.json')
OUTPUT_CSV = os.path.join(BASE_DIR, 'public', 'data', 'analysis_summary.csv')

def load_json(filepath):
    """加载JSON文件"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"警告: 文件 {filepath} 不存在")
        return []
    except json.JSONDecodeError as e:
        print(f"错误: 解析JSON文件 {filepath} 失败: {e}")
        return []

def parse_responses(responses_str):
    """解析responses字符串为字典"""
    try:
        return json.loads(responses_str)
    except:
        return {}

def extract_conversation_metrics(conversation_data):
    """从会话日志中提取指标"""
    metrics = {}
    
    # 按用户分组会话日志
    user_logs = defaultdict(list)
    for log in conversation_data:
        user_id = log.get('user_id')
        if user_id:
            user_logs[user_id].append(log)
    
    # 为每个用户聚合数据
    for user_id, logs in user_logs.items():
        total_turns_all = 0
        teacher_turns_all = 0
        peer_turns_all = 0
        user_turns_all = 0
        role_switches_all = 0
        all_timestamps = []
        bloom_scores_combined = {}
        bloom_completion_combined = {}
        
        for log in logs:
            payload_str = log.get('payload', '{}')
            try:
                payload = json.loads(payload_str)
            except:
                continue
                
            # 提取总轮次
            total_turns = payload.get('totalTurns', 0)
            total_turns_all += total_turns
            
            # 分析testHistory和feedbackHistory
            test_history = payload.get('testHistory', [])
            feedback_history = payload.get('feedbackHistory', [])
            
            # 统计角色使用情况
            last_speaker = None
            
            for msg in test_history:
                speaker = msg.get('speaker', '')
                role = msg.get('role', '')
                timestamp_str = msg.get('timestamp', '')
                
                if timestamp_str:
                    try:
                        ts = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        all_timestamps.append(ts)
                    except:
                        pass
                
                if speaker == '考官' or (role == 'assistant' and speaker != '反馈 Agent'):
                    teacher_turns_all += 1
                    if last_speaker and last_speaker != 'teacher':
                        role_switches_all += 1
                    last_speaker = 'teacher'
                elif speaker == '反馈 Agent' or role == 'feedback':
                    peer_turns_all += 1
                    if last_speaker and last_speaker != 'peer':
                        role_switches_all += 1
                    last_speaker = 'peer'
                elif role == 'user':
                    user_turns_all += 1
                    if last_speaker and last_speaker != 'user':
                        role_switches_all += 1
                    last_speaker = 'user'
            
            # 提取Bloom分类得分
            for feedback in feedback_history:
                task_level = feedback.get('taskLevel', '').lower()
                score = feedback.get('score', 0)
                
                if task_level:
                    # 如果已有得分，取平均值
                    if task_level in bloom_scores_combined:
                        bloom_scores_combined[task_level] = (bloom_scores_combined[task_level] + score) / 2
                    else:
                        bloom_scores_combined[task_level] = score
                    bloom_completion_combined[task_level] = 1 if score > 0 else 0
        
        # 计算会话时长（分钟）
        session_duration = 0
        if len(all_timestamps) >= 2:
            duration = max(all_timestamps) - min(all_timestamps)
            session_duration = duration.total_seconds() / 60
        
        metrics[user_id] = {
            'total_turns': total_turns_all,
            'teacher_turns': teacher_turns_all,
            'peer_turns': peer_turns_all,
            'user_turns': user_turns_all,
            'role_switches': role_switches_all,
            'session_duration_min': round(session_duration, 2),
            'bloom_scores': bloom_scores_combined,
            'bloom_completion': bloom_completion_combined
        }
    
    return metrics

def main():
    # 加载数据
    print("加载数据文件...")
    pretest_data = load_json(PRETEST_FILE)
    posttest_data = load_json(POSTTEST_FILE)
    conversation_data = load_json(CONVERSATION_FILE)
    
    print(f"前测数据: {len(pretest_data)} 条")
    print(f"后测数据: {len(posttest_data)} 条")
    print(f"会话日志: {len(conversation_data)} 条")
    
    # 提取会话指标
    conversation_metrics = extract_conversation_metrics(conversation_data)
    
    # 组织数据
    all_users = set()
    pretest_dict = {}
    posttest_dict = {}
    
    # 处理前测数据
    for item in pretest_data:
        user_id = item.get('user_id')
        if user_id:
            all_users.add(user_id)
            responses = parse_responses(item.get('responses', '{}'))
            pretest_dict[user_id] = {
                'id': item.get('id'),
                'language': item.get('language'),
                'created_at': item.get('created_at'),
                **responses
            }
    
    # 处理后测数据
    for item in posttest_data:
        user_id = item.get('user_id')
        if user_id:
            all_users.add(user_id)
            responses = parse_responses(item.get('responses', '{}'))
            posttest_dict[user_id] = {
                'id': item.get('id'),
                'language': item.get('language'),
                'created_at': item.get('created_at'),
                **responses
            }
    
    # 生成汇总表
    print("\n生成汇总表...")
    rows = []
    
    # 表头
    headers = [
        '用户ID',
        '语言',
        # 基础AI使用情况（前测）
        '前测_Q2_AI使用频率',
        '前测_Q3_AI使用目的',
        '前测_Q4-Q9_一般AI主观评价',
        # 用户体验（后测）
        '后测_Q1_整体体验',
        '后测_Q2_交互质量',
        '后测_Q3_角色差异',
        '后测_Q8_生成内容质量',
        '后测_Q9_系统满意度',
        '后测_Q13_学习效果',
        '后测_Q14_推荐意愿',
        # 多智能体vs一般AI（后测）
        '后测_Q4_相比一般AI',
        '后测_Q11_学习效果对比',
        '后测_Q12_推荐对比',
        # NASA-TLX认知负荷（后测）
        '后测_Q15_心理需求',
        '后测_Q16_生理需求',
        '后测_Q17_时间需求',
        '后测_Q18_表现',
        '后测_Q19_努力程度',
        '后测_Q20_挫败感',
        'NASA-TLX总分',
        # 角色偏好（后测）
        '后测_Q5_教师使用频率',
        '后测_Q6_同伴使用频率',
        '后测_Q7_角色切换频率',
        '后测_Q10_角色偏好',
        # 互动日志
        '会话总轮次',
        '教师轮次',
        '同伴轮次',
        '用户轮次',
        '角色切换次数',
        '会话时长(分钟)',
        # Bloom分类得分
        'Bloom_记忆_得分',
        'Bloom_理解_得分',
        'Bloom_应用_得分',
        'Bloom_分析_得分',
        'Bloom_评估_得分',
        'Bloom_创造_得分',
        'Bloom_完成层级数',
        # 开放反馈
        '前测_Q16_AI优势',
        '前测_Q17_AI顾虑',
        '后测_Q21_最强层级',
        '后测_Q22_最弱层级',
        '后测_Q23_偏好角色',
        '后测_Q24_改进建议'
    ]
    
    # 为每个用户生成一行数据
    for user_id in sorted(all_users):
        pretest = pretest_dict.get(user_id, {})
        posttest = posttest_dict.get(user_id, {})
        conv_metrics = conversation_metrics.get(user_id, {})
        
        # 计算NASA-TLX总分（Q15-Q20）
        nasa_scores = []
        for q in ['q15', 'q16', 'q17', 'q18', 'q19', 'q20']:
            score = posttest.get(q, '')
            if score and score.isdigit():
                nasa_scores.append(int(score))
        nasa_total = sum(nasa_scores) if nasa_scores else ''
        
        # Bloom得分
        bloom_scores = conv_metrics.get('bloom_scores', {})
        bloom_levels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
        bloom_completion = conv_metrics.get('bloom_completion', {})
        bloom_completed_count = sum(bloom_completion.values()) if bloom_completion else 0
        
        row = [
            user_id,
            pretest.get('language', '') or posttest.get('language', ''),
            # 前测
            pretest.get('q2', ''),
            pretest.get('q3', ''),
            f"{pretest.get('q4', '')},{pretest.get('q5', '')},{pretest.get('q6', '')},{pretest.get('q7', '')},{pretest.get('q8', '')},{pretest.get('q9', '')}",
            # 后测用户体验
            posttest.get('q1', ''),
            posttest.get('q2', ''),
            posttest.get('q3', ''),
            posttest.get('q8', ''),
            posttest.get('q9', ''),
            posttest.get('q13', ''),
            posttest.get('q14', ''),
            # 多智能体vs一般AI
            posttest.get('q4', ''),
            posttest.get('q11', ''),
            posttest.get('q12', ''),
            # NASA-TLX
            posttest.get('q15', ''),
            posttest.get('q16', ''),
            posttest.get('q17', ''),
            posttest.get('q18', ''),
            posttest.get('q19', ''),
            posttest.get('q20', ''),
            nasa_total,
            # 角色偏好
            posttest.get('q5', ''),
            posttest.get('q6', ''),
            posttest.get('q7', ''),
            posttest.get('q10', ''),
            # 互动日志
            conv_metrics.get('total_turns', ''),
            conv_metrics.get('teacher_turns', ''),
            conv_metrics.get('peer_turns', ''),
            conv_metrics.get('user_turns', ''),
            conv_metrics.get('role_switches', ''),
            conv_metrics.get('session_duration_min', ''),
            # Bloom得分
            bloom_scores.get('remember', ''),
            bloom_scores.get('understand', ''),
            bloom_scores.get('apply', ''),
            bloom_scores.get('analyze', ''),
            bloom_scores.get('evaluate', ''),
            bloom_scores.get('create', ''),
            bloom_completed_count,
            # 开放反馈
            pretest.get('q16', ''),
            pretest.get('q17', ''),
            posttest.get('q21', ''),
            posttest.get('q22', ''),
            posttest.get('q23', ''),
            posttest.get('q24', '')
        ]
        rows.append(row)
    
    # 写入CSV文件
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    
    print(f"\n汇总表已保存到: {OUTPUT_CSV}")
    print(f"共 {len(rows)} 个用户的数据")
    
    # 打印统计摘要
    print("\n=== 数据统计摘要 ===")
    print(f"有前测数据的用户: {len(pretest_dict)}")
    print(f"有后测数据的用户: {len(posttest_dict)}")
    print(f"有会话日志的用户: {len(conversation_metrics)}")
    
    # 打印每个用户的数据完整性
    print("\n=== 用户数据完整性 ===")
    for user_id in sorted(all_users):
        has_pretest = user_id in pretest_dict
        has_posttest = user_id in posttest_dict
        has_conversation = user_id in conversation_metrics
        print(f"{user_id}: 前测={has_pretest}, 后测={has_posttest}, 会话={has_conversation}")

if __name__ == '__main__':
    main()

