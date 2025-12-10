#!/usr/bin/env python3
"""
从部分解析的对话记录中提取可用数据
即使JSON不完整也能提取基本信息
"""

import json
import re
import csv
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_FILE = os.path.join(BASE_DIR, 'public', 'data', 'conversation_logs_rows.json')
OUTPUT_CSV = os.path.join(BASE_DIR, 'public', 'data', 'conversation_logs_manual_extract.csv')
OUTPUT_README = os.path.join(BASE_DIR, 'public', 'data', 'CONVERSATION_DATA_EXTRACTION_README.md')

def extract_basic_info(payload_str):
    """从payload字符串中提取基本信息，即使JSON不完整"""
    info = {
        'total_turns': 0,
        'has_test_history': False,
        'has_feedback_history': False,
        'first_timestamp': '',
        'last_timestamp': '',
        'message_count': 0
    }
    
    # 提取totalTurns
    match = re.search(r'"totalTurns"\s*:\s*(\d+)', payload_str)
    if match:
        info['total_turns'] = int(match.group(1))
    
    # 检查是否有testHistory
    if '"testHistory"' in payload_str:
        info['has_test_history'] = True
        # 尝试提取时间戳
        timestamps = re.findall(r'"timestamp"\s*:\s*"([^"]+)"', payload_str)
        if timestamps:
            info['first_timestamp'] = timestamps[0]
            info['last_timestamp'] = timestamps[-1]
            info['message_count'] = len(timestamps)
    
    # 检查是否有feedbackHistory
    if '"feedbackHistory"' in payload_str:
        info['has_feedback_history'] = True
    
    return info

def parse_conversation_logs():
    """解析对话记录，提取可用数据"""
    print("Loading conversation logs...")
    
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)
    
    print(f"Found {len(raw_data)} records")
    
    csv_rows = []
    
    for idx, record in enumerate(raw_data):
        user_id = record.get('user_id', '')
        record_id = record.get('id', f'record_{idx}')
        created_at = record.get('created_at', '')
        payload_str = record.get('payload', '{}')
        
        # 提取基本信息
        info = extract_basic_info(payload_str)
        
        # 尝试解析JSON（可能失败）
        payload = None
        try:
            payload = json.loads(payload_str)
        except:
            pass
        
        # 如果成功解析，提取更多信息
        teacher_turns = 0
        peer_turns = 0
        user_turns = 0
        role_switches = 0
        duration_minutes = 0
        bloom_scores = {}
        
        if payload:
            test_history = payload.get('testHistory', [])
            feedback_history = payload.get('feedbackHistory', [])
            
            # 统计角色
            for msg in test_history:
                speaker = msg.get('speaker', '')
                role = msg.get('role', '')
                if speaker == '考官' or (role == 'assistant' and speaker != '反馈 Agent'):
                    teacher_turns += 1
                elif speaker == '反馈 Agent' or role == 'feedback':
                    peer_turns += 1
                elif role == 'user':
                    user_turns += 1
            
            # 计算时长
            timestamps = []
            for msg in test_history:
                ts_str = msg.get('timestamp', '')
                if ts_str:
                    try:
                        ts_str = ts_str.replace('Z', '+00:00')
                        ts = datetime.fromisoformat(ts_str)
                        timestamps.append(ts)
                    except:
                        pass
            
            if len(timestamps) >= 2:
                duration = max(timestamps) - min(timestamps)
                duration_minutes = duration.total_seconds() / 60
            
            # 提取Bloom得分
            for feedback in feedback_history:
                task_level = feedback.get('taskLevel', '').lower()
                score = feedback.get('score', 0)
                if task_level:
                    bloom_scores[task_level] = score
        
        csv_rows.append({
            'user_id': user_id,
            'record_id': record_id,
            'created_at': created_at,
            'total_turns': info['total_turns'] or (payload.get('totalTurns', 0) if payload else 0),
            'duration_minutes': round(duration_minutes, 2),
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
            'first_timestamp': info['first_timestamp'],
            'last_timestamp': info['last_timestamp'],
            'has_test_history': info['has_test_history'],
            'has_feedback_history': info['has_feedback_history'],
            'json_status': 'complete' if payload else 'incomplete'
        })
    
    # 保存CSV
    if csv_rows:
        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8-sig') as f:
            fieldnames = ['user_id', 'record_id', 'created_at', 'total_turns', 'duration_minutes',
                         'teacher_turns', 'peer_turns', 'user_turns', 'role_switches',
                         'bloom_remember', 'bloom_understand', 'bloom_apply',
                         'bloom_analyze', 'bloom_evaluate', 'bloom_create',
                         'first_timestamp', 'last_timestamp', 'has_test_history', 
                         'has_feedback_history', 'json_status']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(csv_rows)
    
    # 生成README
    readme_content = """# 对话记录数据提取说明

## 问题说明

由于`conversation_logs_rows.json`文件中的payload字段包含的JSON字符串可能被截断（超过10240字符限制），
自动解析可能无法完全提取所有数据。

## 已提取的数据

已生成 `conversation_logs_manual_extract.csv` 文件，包含：
- 基本信息：user_id, record_id, created_at, total_turns
- 会话指标：duration_minutes, teacher_turns, peer_turns, user_turns, role_switches
- Bloom得分：bloom_remember, bloom_understand, bloom_apply, bloom_analyze, bloom_evaluate, bloom_create
- 时间戳：first_timestamp, last_timestamp
- 状态标记：json_status (complete/incomplete)

## 手动提取步骤

如果需要完整数据，请按以下步骤操作：

1. 打开 `conversation_logs_rows.json` 文件
2. 对于每条记录：
   - 找到 `payload` 字段
   - 如果JSON完整，可以直接解析
   - 如果JSON被截断，需要从数据库重新导出完整数据

3. 对于每条记录，提取以下信息：
   - `totalTurns`: 总轮次
   - `testHistory`: 消息历史
     - 统计 `speaker == "考官"` 的数量 → teacher_turns
     - 统计 `speaker == "反馈 Agent"` 的数量 → peer_turns  
     - 统计 `role == "user"` 的数量 → user_turns
   - `feedbackHistory`: 反馈历史
     - 提取每个 `taskLevel` 对应的 `score` → bloom_scores
   - 计算 `testHistory` 中第一条和最后一条消息的时间差 → duration_minutes

4. 将提取的数据填入 `conversation_logs_manual_extract.csv`

## 数据格式说明

- **total_turns**: 整数，会话总轮次
- **duration_minutes**: 浮点数，会话时长（分钟）
- **teacher_turns**: 整数，教师智能体发言次数
- **peer_turns**: 整数，同伴智能体发言次数
- **user_turns**: 整数，用户发言次数
- **role_switches**: 整数，角色切换次数
- **bloom_***: 浮点数，Bloom分类得分（0-10分）

## 下一步

完成数据提取后，运行 `statistical_analysis.py` 重新计算相关分析。
"""
    
    with open(OUTPUT_README, 'w', encoding='utf-8') as f:
        f.write(readme_content)
    
    print(f"\nExtracted {len(csv_rows)} records")
    print(f"CSV saved to: {OUTPUT_CSV}")
    print(f"README saved to: {OUTPUT_README}")
    
    # 统计
    complete = sum(1 for r in csv_rows if r['json_status'] == 'complete')
    incomplete = len(csv_rows) - complete
    print(f"\nStatus: {complete} complete, {incomplete} incomplete")

if __name__ == '__main__':
    parse_conversation_logs()

