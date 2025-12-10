#!/usr/bin/env python3
"""
生成LaTeX格式的表格
"""

import pandas as pd
import numpy as np
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_FILE = os.path.join(BASE_DIR, 'public', 'data', 'analysis_summary_complete.csv')
OUTPUT_TEX = os.path.join(BASE_DIR, 'public', 'data', 'latex_tables.tex')

def load_data():
    """加载数据"""
    df = pd.read_csv(CSV_FILE, encoding='utf-8-sig')
    
    # 处理前测Q4-Q9
    if '前测_Q4-Q9_一般AI主观评价' in df.columns:
        def parse_q4_q9(val):
            if pd.isna(val) or val == '':
                return [np.nan] * 6
            try:
                parts = str(val).split(',')
                return [float(p.strip()) if p.strip() else np.nan for p in parts[:6]]
            except:
                return [np.nan] * 6
        
        q4_q9_values = df['前测_Q4-Q9_一般AI主观评价'].apply(parse_q4_q9)
        for i, col_name in enumerate(['前测_Q4', '前测_Q5', '前测_Q6', '前测_Q7', '前测_Q8', '前测_Q9']):
            df[col_name] = [v[i] if i < len(v) else np.nan for v in q4_q9_values]
    
    return df

def format_value(val):
    """格式化数值"""
    if pd.isna(val) or val == '':
        return '---'
    try:
        if isinstance(val, float):
            if val == int(val):
                return str(int(val))
            return f'{val:.2f}'
        return str(val)
    except:
        return str(val)

def generate_table1_basic_ai_usage(df):
    """Table 1: 基础AI使用情况"""
    tex = "\\begin{table}[htbp]\n"
    tex += "\\centering\n"
    tex += "\\caption{Basic AI Usage Patterns (Pre-test)}\n"
    tex += "\\label{tab:basic_ai_usage}\n"
    tex += "\\begin{tabular}{lcc}\n"
    tex += "\\toprule\n"
    tex += "Participant ID & AI Usage Frequency & AI Usage Purpose \\\\\n"
    tex += "\\midrule\n"
    
    for idx, row in df.iterrows():
        user_id = row.get('用户ID', '')
        q2 = format_value(row.get('前测_Q2_AI使用频率', ''))
        q3 = str(row.get('前测_Q3_AI使用目的', '')).replace('|', ', ')
        
        tex += f"{user_id} & {q2} & {q3} \\\\\n"
    
    tex += "\\bottomrule\n"
    tex += "\\end{tabular}\n"
    tex += "\\end{table}\n\n"
    
    return tex

def generate_table2_user_experience(df):
    """Table 2: 用户体验评分"""
    tex = "\\begin{table}[htbp]\n"
    tex += "\\centering\n"
    tex += "\\caption{User Experience Ratings (Post-test)}\n"
    tex += "\\label{tab:user_experience}\n"
    tex += "\\resizebox{\\textwidth}{!}{%\n"
    tex += "\\begin{tabular}{lccccccc}\n"
    tex += "\\toprule\n"
    tex += "Participant & Q1 & Q2 & Q3 & Q8 & Q9 & Q13 & Q14 \\\\\n"
    tex += "\\midrule\n"
    
    exp_cols = ['后测_Q1_整体体验', '后测_Q2_交互质量', '后测_Q3_角色差异',
                '后测_Q8_生成内容质量', '后测_Q9_系统满意度', 
                '后测_Q13_学习效果', '后测_Q14_推荐意愿']
    
    for idx, row in df.iterrows():
        user_id = row.get('用户ID', '')
        values = [format_value(row.get(col, '')) for col in exp_cols]
        tex += f"{user_id} & {' & '.join(values)} \\\\\n"
    
    tex += "\\midrule\n"
    tex += "Mean & "
    means = []
    for col in exp_cols:
        values = df[col].dropna()
        if len(values) > 0:
            means.append(f"{values.mean():.2f}")
        else:
            means.append("---")
    tex += " & ".join(means) + " \\\\\n"
    
    tex += "SD & "
    stds = []
    for col in exp_cols:
        values = df[col].dropna()
        if len(values) > 0:
            stds.append(f"{values.std():.2f}")
        else:
            stds.append("---")
    tex += " & ".join(stds) + " \\\\\n"
    
    tex += "\\bottomrule\n"
    tex += "\\end{tabular}%\n"
    tex += "}\n"
    tex += "\\end{table}\n\n"
    
    return tex

def generate_table3_pretest_posttest(df):
    """Table 3: 前后测对比"""
    tex = "\\begin{table}[htbp]\n"
    tex += "\\centering\n"
    tex += "\\caption{Pre-test vs Post-test Comparison}\n"
    tex += "\\label{tab:pretest_posttest}\n"
    tex += "\\begin{tabular}{lcc}\n"
    tex += "\\toprule\n"
    tex += "Participant & Pre-test Mean & Post-test Mean \\\\\n"
    tex += "\\midrule\n"
    
    # 计算前测和后测平均分
    pretest_cols = ['前测_Q4', '前测_Q5', '前测_Q6', '前测_Q7', '前测_Q8', '前测_Q9']
    posttest_cols = ['后测_Q1_整体体验', '后测_Q2_交互质量', '后测_Q3_角色差异',
                     '后测_Q8_生成内容质量', '后测_Q9_系统满意度', 
                     '后测_Q13_学习效果', '后测_Q14_推荐意愿']
    
    valid_users = []
    for idx, row in df.iterrows():
        user_id = row.get('用户ID', '')
        pretest_vals = [row.get(col) for col in pretest_cols if pd.notna(row.get(col))]
        posttest_vals = [row.get(col) for col in posttest_cols if pd.notna(row.get(col))]
        
        if len(pretest_vals) > 0 and len(posttest_vals) > 0:
            pretest_mean = np.mean(pretest_vals)
            posttest_mean = np.mean(posttest_vals)
            valid_users.append((user_id, pretest_mean, posttest_mean))
            tex += f"{user_id} & {pretest_mean:.2f} & {posttest_mean:.2f} \\\\\n"
    
    if valid_users:
        pretest_means = [u[1] for u in valid_users]
        posttest_means = [u[2] for u in valid_users]
        
        tex += "\\midrule\n"
        tex += f"Overall Mean & {np.mean(pretest_means):.2f} & {np.mean(posttest_means):.2f} \\\\\n"
        tex += f"SD & {np.std(pretest_means):.2f} & {np.std(posttest_means):.2f} \\\\\n"
    
    tex += "\\bottomrule\n"
    tex += "\\end{tabular}\n"
    tex += "\\end{table}\n\n"
    
    return tex

def generate_table4_nasa_tlx(df):
    """Table 4: NASA-TLX"""
    tex = "\\begin{table}[htbp]\n"
    tex += "\\centering\n"
    tex += "\\caption{NASA-TLX Cognitive Load Assessment}\n"
    tex += "\\label{tab:nasa_tlx}\n"
    tex += "\\resizebox{\\textwidth}{!}{%\n"
    tex += "\\begin{tabular}{lcccccc}\n"
    tex += "\\toprule\n"
    tex += "Participant & Q15 & Q16 & Q17 & Q18 & Q19 & Q20 & Total \\\\\n"
    tex += "\\midrule\n"
    
    nasa_cols = ['后测_Q15_心理需求', '后测_Q16_生理需求', '后测_Q17_时间需求',
                 '后测_Q18_表现', '后测_Q19_努力程度', '后测_Q20_挫败感']
    
    for idx, row in df.iterrows():
        user_id = row.get('用户ID', '')
        values = [format_value(row.get(col, '')) for col in nasa_cols]
        total = format_value(row.get('NASA-TLX总分', ''))
        tex += f"{user_id} & {' & '.join(values)} & {total} \\\\\n"
    
    tex += "\\midrule\n"
    tex += "Mean & "
    means = []
    for col in nasa_cols:
        values = df[col].dropna()
        if len(values) > 0:
            means.append(f"{values.mean():.2f}")
        else:
            means.append("---")
    tex += " & ".join(means)
    
    total_values = df['NASA-TLX总分'].dropna()
    if len(total_values) > 0:
        tex += f" & {total_values.mean():.2f}"
    else:
        tex += " & ---"
    tex += " \\\\\n"
    
    tex += "\\bottomrule\n"
    tex += "\\end{tabular}%\n"
    tex += "}\n"
    tex += "\\end{table}\n\n"
    
    return tex

def generate_table5_role_preference(df):
    """Table 5: 角色偏好"""
    tex = "\\begin{table}[htbp]\n"
    tex += "\\centering\n"
    tex += "\\caption{Role Preference: Teacher vs Peer Agent}\n"
    tex += "\\label{tab:role_preference}\n"
    tex += "\\begin{tabular}{lcccc}\n"
    tex += "\\toprule\n"
    tex += "Participant & Q5 (Teacher) & Q6 (Peer) & Q7 (Switching) & Q10 (Preference) \\\\\n"
    tex += "\\midrule\n"
    
    role_cols = ['后测_Q5_教师使用频率', '后测_Q6_同伴使用频率', 
                 '后测_Q7_角色切换频率', '后测_Q10_角色偏好']
    
    for idx, row in df.iterrows():
        user_id = row.get('用户ID', '')
        values = [format_value(row.get(col, '')) for col in role_cols]
        tex += f"{user_id} & {' & '.join(values)} \\\\\n"
    
    tex += "\\midrule\n"
    tex += "Mean & "
    means = []
    for col in role_cols:
        values = df[col].dropna()
        if len(values) > 0:
            means.append(f"{values.mean():.2f}")
        else:
            means.append("---")
    tex += " & ".join(means) + " \\\\\n"
    
    tex += "\\bottomrule\n"
    tex += "\\end{tabular}\n"
    tex += "\\end{table}\n\n"
    
    return tex

def generate_table6_interaction_bloom(df):
    """Table 6: 互动量与Bloom得分"""
    tex = "\\begin{table}[htbp]\n"
    tex += "\\centering\n"
    tex += "\\caption{Interaction Metrics and Bloom Taxonomy Scores}\n"
    tex += "\\label{tab:interaction_bloom}\n"
    tex += "\\resizebox{\\textwidth}{!}{%\n"
    tex += "\\begin{tabular}{lccccccccc}\n"
    tex += "\\toprule\n"
    tex += "Participant & Total & Teacher & Peer & User & Switches & Duration & Bloom & Bloom & Completed \\\\\n"
    tex += "& Turns & Turns & Turns & Turns & & (min) & Total & Mean & Levels \\\\\n"
    tex += "\\midrule\n"
    
    # 计算Bloom总分和平均分
    bloom_cols = ['Bloom_记忆_得分', 'Bloom_理解_得分', 'Bloom_应用_得分',
                  'Bloom_分析_得分', 'Bloom_评估_得分', 'Bloom_创造_得分']
    
    for idx, row in df.iterrows():
        user_id = row.get('用户ID', '')
        total_turns = format_value(row.get('会话总轮次', ''))
        teacher_turns = format_value(row.get('教师轮次', ''))
        peer_turns = format_value(row.get('同伴轮次', ''))
        user_turns = format_value(row.get('用户轮次', ''))
        switches = format_value(row.get('角色切换次数', ''))
        duration = format_value(row.get('会话时长(分钟)', ''))
        
        bloom_vals = [row.get(col) for col in bloom_cols if pd.notna(row.get(col))]
        if len(bloom_vals) > 0:
            bloom_total = np.sum(bloom_vals)
            bloom_mean = np.mean(bloom_vals)
        else:
            bloom_total = "---"
            bloom_mean = "---"
        
        completed = format_value(row.get('Bloom_完成层级数', ''))
        
        tex += f"{user_id} & {total_turns} & {teacher_turns} & {peer_turns} & {user_turns} & "
        tex += f"{switches} & {duration} & {format_value(bloom_total)} & {format_value(bloom_mean)} & {completed} \\\\\n"
    
    tex += "\\bottomrule\n"
    tex += "\\end{tabular}%\n"
    tex += "}\n"
    tex += "\\end{table}\n\n"
    
    return tex

def generate_table7_correlation(df):
    """Table 7: 相关分析结果"""
    from scipy import stats
    
    tex = "\\begin{table}[htbp]\n"
    tex += "\\centering\n"
    tex += "\\caption{Correlation Analysis: Interaction Metrics vs Bloom Total Score}\n"
    tex += "\\label{tab:correlation}\n"
    tex += "\\begin{tabular}{lcc}\n"
    tex += "\\toprule\n"
    tex += "Interaction Metric & Pearson r & p-value \\\\\n"
    tex += "\\midrule\n"
    
    # 提取有效数据
    valid = df[(df['会话总轮次'].notna()) & (df['会话总轮次'] > 0) & 
               (df['Bloom_记忆_得分'].notna())].copy()
    
    # 计算Bloom总分
    bloom_cols = ['Bloom_记忆_得分', 'Bloom_理解_得分', 'Bloom_应用_得分',
                  'Bloom_分析_得分', 'Bloom_评估_得分', 'Bloom_创造_得分']
    valid['Bloom总分'] = valid[bloom_cols].sum(axis=1)
    
    interaction_vars = [
        ('会话总轮次', 'Total Turns'),
        ('教师轮次', 'Teacher Turns'),
        ('同伴轮次', 'Peer Turns'),
        ('角色切换次数', 'Role Switches'),
        ('会话时长(分钟)', 'Session Duration')
    ]
    
    for var_col, var_label in interaction_vars:
        if var_col in valid.columns:
            x = valid[var_col].dropna()
            y = valid['Bloom总分'].dropna()
            
            common_idx = x.index.intersection(y.index)
            if len(common_idx) >= 3:
                x_common = x[common_idx]
                y_common = y[common_idx]
                
                corr_coef, p_value = stats.pearsonr(x_common, y_common)
                
                # 添加显著性标记
                sig_mark = ""
                if p_value < 0.001:
                    sig_mark = "***"
                elif p_value < 0.01:
                    sig_mark = "**"
                elif p_value < 0.05:
                    sig_mark = "*"
                
                tex += f"{var_label} & {corr_coef:.3f}{sig_mark} & {p_value:.4f} \\\\\n"
    
    tex += "\\midrule\n"
    tex += "\\multicolumn{3}{l}{\\footnotesize *p$<$0.05, **p$<$0.01, ***p$<$0.001} \\\\\n"
    tex += "\\bottomrule\n"
    tex += "\\end{tabular}\n"
    tex += "\\end{table}\n\n"
    
    return tex

def main():
    print("Loading data...")
    df = load_data()
    
    print("Generating LaTeX tables...")
    tex_content = "% LaTeX Tables for Research Results\n"
    tex_content += "% Generated automatically\n\n"
    
    tex_content += generate_table1_basic_ai_usage(df)
    tex_content += generate_table2_user_experience(df)
    tex_content += generate_table3_pretest_posttest(df)
    tex_content += generate_table4_nasa_tlx(df)
    tex_content += generate_table5_role_preference(df)
    tex_content += generate_table6_interaction_bloom(df)
    tex_content += generate_table7_correlation(df)
    
    with open(OUTPUT_TEX, 'w', encoding='utf-8') as f:
        f.write(tex_content)
    
    print(f"LaTeX tables saved to: {OUTPUT_TEX}")

if __name__ == '__main__':
    main()

