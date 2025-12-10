#!/usr/bin/env python3
"""
生成Markdown格式的汇总表
"""

import json
import os
import csv
from collections import defaultdict
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_FILE = os.path.join(BASE_DIR, 'public', 'data', 'analysis_summary.csv')
OUTPUT_MD = os.path.join(BASE_DIR, 'public', 'data', 'analysis_summary.md')

def load_csv():
    """加载CSV文件"""
    rows = []
    with open(CSV_FILE, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows

def generate_markdown_table(rows):
    """生成Markdown表格"""
    
    md_content = """# 研究数据汇总表

## 数据概览
- 前测用户数: 5
- 后测用户数: 4  
- 有会话日志用户数: 3

---

## 1. 基础AI使用情况（前测）

| 用户ID | 语言 | Q2: AI使用频率 | Q3: AI使用目的 | Q4-Q9: 一般AI主观评价 |
|--------|------|----------------|----------------|----------------------|
"""
    
    for row in rows:
        user_id = row.get('用户ID', '')
        lang = row.get('语言', '')
        q2 = row.get('前测_Q2_AI使用频率', '')
        q3 = row.get('前测_Q3_AI使用目的', '')
        q4_9 = row.get('前测_Q4-Q9_一般AI主观评价', '')
        
        md_content += f"| {user_id} | {lang} | {q2} | {q3} | {q4_9} |\n"
    
    md_content += """
---

## 2. User Experience

### 2.1 整体体验评价（后测 Q1, Q2, Q3, Q8, Q9, Q13, Q14）

| 用户ID | Q1: 整体体验 | Q2: 交互质量 | Q3: 角色差异 | Q8: 生成内容质量 | Q9: 系统满意度 | Q13: 学习效果 | Q14: 推荐意愿 |
|--------|--------------|--------------|--------------|------------------|----------------|---------------|---------------|
"""
    
    for row in rows:
        user_id = row.get('用户ID', '')
        q1 = row.get('后测_Q1_整体体验', '')
        q2 = row.get('后测_Q2_交互质量', '')
        q3 = row.get('后测_Q3_角色差异', '')
        q8 = row.get('后测_Q8_生成内容质量', '')
        q9 = row.get('后测_Q9_系统满意度', '')
        q13 = row.get('后测_Q13_学习效果', '')
        q14 = row.get('后测_Q14_推荐意愿', '')
        
        md_content += f"| {user_id} | {q1} | {q2} | {q3} | {q8} | {q9} | {q13} | {q14} |\n"
    
    md_content += """
### 2.2 多智能体 vs 一般AI模型对比（后测 Q4, Q11, Q12 + 前测 Q4-Q9）

| 用户ID | 后测Q4: 相比一般AI | 后测Q11: 学习效果对比 | 后测Q12: 推荐对比 | 前测Q4-Q9: 一般AI评价 |
|--------|---------------------|------------------------|-------------------|----------------------|
"""
    
    for row in rows:
        user_id = row.get('用户ID', '')
        q4 = row.get('后测_Q4_相比一般AI', '')
        q11 = row.get('后测_Q11_学习效果对比', '')
        q12 = row.get('后测_Q12_推荐对比', '')
        pretest_q = row.get('前测_Q4-Q9_一般AI主观评价', '')
        
        md_content += f"| {user_id} | {q4} | {q11} | {q12} | {pretest_q} |\n"
    
    md_content += """
### 2.3 NASA-TLX认知负荷评分（后测 Q15-Q20）

| 用户ID | Q15: 心理需求 | Q16: 生理需求 | Q17: 时间需求 | Q18: 表现 | Q19: 努力程度 | Q20: 挫败感 | NASA-TLX总分 |
|--------|---------------|---------------|---------------|-----------|---------------|-------------|--------------|
"""
    
    for row in rows:
        user_id = row.get('用户ID', '')
        q15 = row.get('后测_Q15_心理需求', '')
        q16 = row.get('后测_Q16_生理需求', '')
        q17 = row.get('后测_Q17_时间需求', '')
        q18 = row.get('后测_Q18_表现', '')
        q19 = row.get('后测_Q19_努力程度', '')
        q20 = row.get('后测_Q20_挫败感', '')
        total = row.get('NASA-TLX总分', '')
        
        md_content += f"| {user_id} | {q15} | {q16} | {q17} | {q18} | {q19} | {q20} | {total} |\n"
    
    md_content += """
### 2.4 角色偏好：教师 vs 同伴智能体（后测 Q5, Q6, Q7, Q10）

| 用户ID | Q5: 教师使用频率 | Q6: 同伴使用频率 | Q7: 角色切换频率 | Q10: 角色偏好 |
|--------|------------------|------------------|------------------|---------------|
"""
    
    for row in rows:
        user_id = row.get('用户ID', '')
        q5 = row.get('后测_Q5_教师使用频率', '')
        q6 = row.get('后测_Q6_同伴使用频率', '')
        q7 = row.get('后测_Q7_角色切换频率', '')
        q10 = row.get('后测_Q10_角色偏好', '')
        
        md_content += f"| {user_id} | {q5} | {q6} | {q7} | {q10} |\n"
    
    md_content += """
---

## 3. Study Outcome

### 3.1 会话互动数据

| 用户ID | 会话总轮次 | 教师轮次 | 同伴轮次 | 用户轮次 | 角色切换次数 | 会话时长(分钟) |
|--------|------------|----------|----------|----------|--------------|----------------|
"""
    
    for row in rows:
        user_id = row.get('用户ID', '')
        total = row.get('会话总轮次', '')
        teacher = row.get('教师轮次', '')
        peer = row.get('同伴轮次', '')
        user_turns = row.get('用户轮次', '')
        switches = row.get('角色切换次数', '')
        duration = row.get('会话时长(分钟)', '')
        
        md_content += f"| {user_id} | {total} | {teacher} | {peer} | {user_turns} | {switches} | {duration} |\n"
    
    md_content += """
### 3.2 Bloom分类任务完成情况

| 用户ID | 记忆得分 | 理解得分 | 应用得分 | 分析得分 | 评估得分 | 创造得分 | 完成层级数 |
|--------|----------|----------|----------|----------|----------|----------|------------|
"""
    
    for row in rows:
        user_id = row.get('用户ID', '')
        remember = row.get('Bloom_记忆_得分', '')
        understand = row.get('Bloom_理解_得分', '')
        apply = row.get('Bloom_应用_得分', '')
        analyze = row.get('Bloom_分析_得分', '')
        evaluate = row.get('Bloom_评估_得分', '')
        create = row.get('Bloom_创造_得分', '')
        completed = row.get('Bloom_完成层级数', '')
        
        md_content += f"| {user_id} | {remember} | {understand} | {apply} | {analyze} | {evaluate} | {create} | {completed} |\n"
    
    md_content += """
---

## 4. 开放反馈

| 用户ID | 前测Q16: AI优势 | 前测Q17: AI顾虑 | 后测Q21: 最强层级 | 后测Q22: 最弱层级 | 后测Q23: 偏好角色 | 后测Q24: 改进建议 |
|--------|-----------------|-----------------|-------------------|-------------------|-------------------|-------------------|
"""
    
    for row in rows:
        user_id = row.get('用户ID', '')
        q16 = row.get('前测_Q16_AI优势', '').replace('\n', ' ').replace('|', '\\|')
        q17 = row.get('前测_Q17_AI顾虑', '').replace('\n', ' ').replace('|', '\\|')
        q21 = row.get('后测_Q21_最强层级', '').replace('\n', ' ').replace('|', '\\|')
        q22 = row.get('后测_Q22_最弱层级', '').replace('\n', ' ').replace('|', '\\|')
        q23 = row.get('后测_Q23_偏好角色', '').replace('\n', ' ').replace('|', '\\|')
        q24 = row.get('后测_Q24_改进建议', '').replace('\n', ' ').replace('|', '\\|')
        
        md_content += f"| {user_id} | {q16} | {q17} | {q21} | {q22} | {q23} | {q24} |\n"
    
    md_content += """
---

## 数据说明

- **评分标准**: 1-5分（Likert量表），其中5分表示最高/最好
- **NASA-TLX**: 认知负荷评估量表，总分范围6-30分，分数越高表示认知负荷越大
- **Bloom分类**: 基于布鲁姆分类法的6个认知层级评估
- **会话时长**: 从第一次交互到最后一次交互的总时长（分钟）
- **角色切换**: 在不同智能体角色（教师/同伴）之间切换的次数

"""
    
    return md_content

def main():
    rows = load_csv()
    md_content = generate_markdown_table(rows)
    
    with open(OUTPUT_MD, 'w', encoding='utf-8') as f:
        f.write(md_content)
    
    print(f"Markdown汇总表已保存到: {OUTPUT_MD}")

if __name__ == '__main__':
    main()

