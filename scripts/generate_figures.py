#!/usr/bin/env python3
"""
生成研究结果图表
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import os
from scipy import stats

# 设置中文字体和样式
plt.rcParams['font.sans-serif'] = ['Arial', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
sns.set_style("whitegrid")
sns.set_palette("husl")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_FILE = os.path.join(BASE_DIR, 'public', 'data', 'analysis_summary_complete.csv')
FIGURES_DIR = os.path.join(BASE_DIR, 'public', 'data', 'figures')

# 创建图表目录
os.makedirs(FIGURES_DIR, exist_ok=True)

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
    
    # 计算前测平均分
    pretest_cols = ['前测_Q4', '前测_Q5', '前测_Q6', '前测_Q7', '前测_Q8', '前测_Q9']
    df['前测平均分'] = df[pretest_cols].mean(axis=1)
    
    # 计算后测平均分
    posttest_cols = ['后测_Q1_整体体验', '后测_Q2_交互质量', '后测_Q3_角色差异',
                     '后测_Q8_生成内容质量', '后测_Q9_系统满意度', 
                     '后测_Q13_学习效果', '后测_Q14_推荐意愿']
    df['后测平均分'] = df[posttest_cols].mean(axis=1)
    
    # 计算Bloom总分
    bloom_cols = ['Bloom_记忆_得分', 'Bloom_理解_得分', 'Bloom_应用_得分',
                  'Bloom_分析_得分', 'Bloom_评估_得分', 'Bloom_创造_得分']
    df['Bloom总分'] = df[bloom_cols].sum(axis=1)
    df['Bloom平均分'] = df[bloom_cols].mean(axis=1)
    
    return df

def figure1_basic_ai_usage(df):
    """Figure 1: 基础AI使用情况"""
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    
    # Q2: AI使用频率
    q2_counts = df['前测_Q2_AI使用频率'].value_counts()
    axes[0].bar(q2_counts.index, q2_counts.values, color=['#3498db', '#2ecc71', '#e74c3c'])
    axes[0].set_xlabel('AI Usage Frequency', fontsize=11)
    axes[0].set_ylabel('Number of Participants', fontsize=11)
    axes[0].set_title('(a) AI Usage Frequency', fontsize=12, fontweight='bold')
    axes[0].grid(axis='y', alpha=0.3)
    
    # Q3: AI使用目的（多选）
    q3_data = []
    for val in df['前测_Q3_AI使用目的'].dropna():
        purposes = str(val).split('|')
        q3_data.extend([p.strip() for p in purposes if p.strip()])
    
    q3_counts = pd.Series(q3_data).value_counts()
    axes[1].barh(q3_counts.index, q3_counts.values, color='#9b59b6')
    axes[1].set_xlabel('Number of Participants', fontsize=11)
    axes[1].set_ylabel('Purpose', fontsize=11)
    axes[1].set_title('(b) AI Usage Purposes', fontsize=12, fontweight='bold')
    axes[1].grid(axis='x', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, 'figure1_basic_ai_usage.pdf'), dpi=300, bbox_inches='tight')
    plt.savefig(os.path.join(FIGURES_DIR, 'figure1_basic_ai_usage.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated Figure 1: Basic AI Usage")

def figure2_user_experience(df):
    """Figure 2: 用户体验评分"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # 提取后测用户体验指标
    exp_cols = ['后测_Q1_整体体验', '后测_Q2_交互质量', '后测_Q3_角色差异',
                '后测_Q8_生成内容质量', '后测_Q9_系统满意度', 
                '后测_Q13_学习效果', '后测_Q14_推荐意愿']
    exp_labels = ['Overall\nExperience', 'Interaction\nQuality', 'Role\nDifference',
                  'Content\nQuality', 'System\nSatisfaction',
                  'Learning\nEffectiveness', 'Recommendation\nWillingness']
    
    means = []
    stds = []
    for col in exp_cols:
        values = df[col].dropna()
        means.append(values.mean())
        stds.append(values.std())
    
    x_pos = np.arange(len(exp_labels))
    bars = ax.bar(x_pos, means, yerr=stds, capsize=5, color='#3498db', alpha=0.7, edgecolor='black')
    
    ax.set_xlabel('User Experience Dimensions', fontsize=12)
    ax.set_ylabel('Mean Score (1-5 Likert Scale)', fontsize=12)
    ax.set_title('User Experience Ratings', fontsize=14, fontweight='bold')
    ax.set_xticks(x_pos)
    ax.set_xticklabels(exp_labels, rotation=45, ha='right')
    ax.set_ylim(0, 5.5)
    ax.grid(axis='y', alpha=0.3)
    ax.axhline(y=3, color='r', linestyle='--', alpha=0.5, label='Neutral (3)')
    ax.legend()
    
    # 添加数值标签
    for i, (mean, std) in enumerate(zip(means, stds)):
        ax.text(i, mean + std + 0.1, f'{mean:.2f}', ha='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, 'figure2_user_experience.pdf'), dpi=300, bbox_inches='tight')
    plt.savefig(os.path.join(FIGURES_DIR, 'figure2_user_experience.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated Figure 2: User Experience")

def figure3_pretest_posttest_comparison(df):
    """Figure 3: 前后测对比"""
    fig, ax = plt.subplots(figsize=(8, 6))
    
    # 提取有前后测数据的用户
    valid = df[df['前测平均分'].notna() & df['后测平均分'].notna()].copy()
    
    if len(valid) > 0:
        pretest_scores = valid['前测平均分'].values
        posttest_scores = valid['后测平均分'].values
        
        # 绘制配对线
        for i in range(len(pretest_scores)):
            ax.plot([1, 2], [pretest_scores[i], posttest_scores[i]], 
                   'o-', color='gray', alpha=0.3, linewidth=1)
        
        # 绘制均值点
        ax.plot([1, 2], [pretest_scores.mean(), posttest_scores.mean()], 
               'o-', color='red', linewidth=3, markersize=10, label='Mean')
        
        # 添加误差棒
        ax.errorbar([1], [pretest_scores.mean()], yerr=pretest_scores.std(), 
                   fmt='o', color='red', capsize=10, capthick=2, markersize=10)
        ax.errorbar([2], [posttest_scores.mean()], yerr=posttest_scores.std(), 
                   fmt='o', color='red', capsize=10, capthick=2, markersize=10)
        
        ax.set_xlim(0.5, 2.5)
        ax.set_xticks([1, 2])
        ax.set_xticklabels(['Pre-test\n(General AI)', 'Post-test\n(Multi-agent System)'], fontsize=11)
        ax.set_ylabel('Mean Score (1-5 Likert Scale)', fontsize=12)
        ax.set_title('Pre-test vs Post-test Comparison', fontsize=14, fontweight='bold')
        ax.grid(axis='y', alpha=0.3)
        ax.legend()
        
        # 添加统计信息
        t_stat, p_value = stats.ttest_rel(pretest_scores, posttest_scores)
        ax.text(1.5, max(pretest_scores.max(), posttest_scores.max()) + 0.2,
               f'Paired t-test: p = {p_value:.4f}', ha='center', fontsize=10,
               bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, 'figure3_pretest_posttest.pdf'), dpi=300, bbox_inches='tight')
    plt.savefig(os.path.join(FIGURES_DIR, 'figure3_pretest_posttest.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated Figure 3: Pre-test vs Post-test Comparison")

def figure4_nasa_tlx(df):
    """Figure 4: NASA-TLX认知负荷"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    nasa_cols = ['后测_Q15_心理需求', '后测_Q16_生理需求', '后测_Q17_时间需求',
                 '后测_Q18_表现', '后测_Q19_努力程度', '后测_Q20_挫败感']
    nasa_labels = ['Mental\nDemand', 'Physical\nDemand', 'Temporal\nDemand',
                   'Performance', 'Effort', 'Frustration']
    
    means = []
    stds = []
    for col in nasa_cols:
        values = df[col].dropna()
        if len(values) > 0:
            means.append(values.mean())
            stds.append(values.std())
        else:
            means.append(np.nan)
            stds.append(np.nan)
    
    x_pos = np.arange(len(nasa_labels))
    bars = ax.bar(x_pos, means, yerr=stds, capsize=5, color='#e74c3c', alpha=0.7, edgecolor='black')
    
    ax.set_xlabel('NASA-TLX Dimensions', fontsize=12)
    ax.set_ylabel('Mean Score (1-5 Scale)', fontsize=12)
    ax.set_title('NASA-TLX Cognitive Load Assessment', fontsize=14, fontweight='bold')
    ax.set_xticks(x_pos)
    ax.set_xticklabels(nasa_labels, rotation=45, ha='right')
    ax.set_ylim(0, 5.5)
    ax.grid(axis='y', alpha=0.3)
    
    # 添加数值标签
    for i, (mean, std) in enumerate(zip(means, stds)):
        if not np.isnan(mean):
            ax.text(i, mean + std + 0.1, f'{mean:.2f}', ha='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, 'figure4_nasa_tlx.pdf'), dpi=300, bbox_inches='tight')
    plt.savefig(os.path.join(FIGURES_DIR, 'figure4_nasa_tlx.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated Figure 4: NASA-TLX")

def figure5_role_preference(df):
    """Figure 5: 角色偏好"""
    fig, ax = plt.subplots(figsize=(8, 6))
    
    role_cols = ['后测_Q5_教师使用频率', '后测_Q6_同伴使用频率', '后测_Q7_角色切换频率']
    role_labels = ['Teacher Agent\nFrequency', 'Peer Agent\nFrequency', 'Role Switching\nFrequency']
    
    means = []
    stds = []
    for col in role_cols:
        values = df[col].dropna()
        if len(values) > 0:
            means.append(values.mean())
            stds.append(values.std())
        else:
            means.append(np.nan)
            stds.append(np.nan)
    
    x_pos = np.arange(len(role_labels))
    bars = ax.bar(x_pos, means, yerr=stds, capsize=5, 
                  color=['#3498db', '#2ecc71', '#f39c12'], alpha=0.7, edgecolor='black')
    
    ax.set_xlabel('Role Preference Dimensions', fontsize=12)
    ax.set_ylabel('Mean Score (1-5 Likert Scale)', fontsize=12)
    ax.set_title('Role Preference: Teacher vs Peer Agent', fontsize=14, fontweight='bold')
    ax.set_xticks(x_pos)
    ax.set_xticklabels(role_labels)
    ax.set_ylim(0, 5.5)
    ax.grid(axis='y', alpha=0.3)
    
    # 添加数值标签
    for i, (mean, std) in enumerate(zip(means, stds)):
        if not np.isnan(mean):
            ax.text(i, mean + std + 0.1, f'{mean:.2f}', ha='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, 'figure5_role_preference.pdf'), dpi=300, bbox_inches='tight')
    plt.savefig(os.path.join(FIGURES_DIR, 'figure5_role_preference.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated Figure 5: Role Preference")

def figure6_interaction_bloom_correlation(df):
    """Figure 6: 互动量与Bloom得分相关分析"""
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    axes = axes.flatten()
    
    # 提取有会话和Bloom数据的用户
    valid = df[(df['会话总轮次'].notna()) & (df['会话总轮次'] > 0) & 
               (df['Bloom总分'].notna())].copy()
    
    if len(valid) < 3:
        print("Warning: Insufficient data for correlation plots")
        return
    
    interaction_vars = [
        ('会话总轮次', 'Total Turns', axes[0]),
        ('教师轮次', 'Teacher Turns', axes[1]),
        ('同伴轮次', 'Peer Turns', axes[2]),
        ('角色切换次数', 'Role Switches', axes[3]),
        ('会话时长(分钟)', 'Session Duration (min)', axes[4]),
    ]
    
    # 第6个子图用于汇总
    ax_summary = axes[5]
    ax_summary.axis('off')
    
    correlations = []
    p_values = []
    var_names = []
    
    for var_col, var_label, ax in interaction_vars:
        if var_col in valid.columns:
            x = valid[var_col].dropna()
            y = valid['Bloom总分'].dropna()
            
            common_idx = x.index.intersection(y.index)
            if len(common_idx) >= 3:
                x_common = x[common_idx]
                y_common = y[common_idx]
                
                # 散点图
                ax.scatter(x_common, y_common, alpha=0.6, s=100, color='#3498db', edgecolors='black')
                
                # 拟合线
                z = np.polyfit(x_common, y_common, 1)
                p = np.poly1d(z)
                ax.plot(x_common, p(x_common), "r--", alpha=0.8, linewidth=2)
                
                # 计算相关系数
                corr_coef, p_value = stats.pearsonr(x_common, y_common)
                correlations.append(corr_coef)
                p_values.append(p_value)
                var_names.append(var_label)
                
                ax.set_xlabel(var_label, fontsize=10)
                ax.set_ylabel('Bloom Total Score', fontsize=10)
                ax.set_title(f'r = {corr_coef:.3f}, p = {p_value:.3f}', fontsize=10)
                ax.grid(alpha=0.3)
    
    # 汇总图：相关系数条形图
    if correlations:
        colors = ['green' if p < 0.05 else 'orange' for p in p_values]
        bars = ax_summary.barh(var_names, correlations, color=colors, alpha=0.7, edgecolor='black')
        ax_summary.set_xlabel('Pearson Correlation Coefficient', fontsize=11)
        ax_summary.set_title('Summary: Correlation Coefficients', fontsize=12, fontweight='bold')
        ax_summary.axvline(x=0, color='black', linestyle='-', linewidth=0.8)
        ax_summary.grid(axis='x', alpha=0.3)
        
        # 添加数值标签
        for i, (corr, p) in enumerate(zip(correlations, p_values)):
            ax_summary.text(corr + 0.05 if corr > 0 else corr - 0.05, i, 
                          f'{corr:.3f} (p={p:.3f})', 
                          va='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, 'figure6_correlation.pdf'), dpi=300, bbox_inches='tight')
    plt.savefig(os.path.join(FIGURES_DIR, 'figure6_correlation.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated Figure 6: Interaction vs Bloom Correlation")

def figure7_bloom_scores(df):
    """Figure 7: Bloom分类得分"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    bloom_cols = ['Bloom_记忆_得分', 'Bloom_理解_得分', 'Bloom_应用_得分',
                  'Bloom_分析_得分', 'Bloom_评估_得分', 'Bloom_创造_得分']
    bloom_labels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
    
    means = []
    stds = []
    for col in bloom_cols:
        values = df[col].dropna()
        if len(values) > 0:
            means.append(values.mean())
            stds.append(values.std())
        else:
            means.append(np.nan)
            stds.append(np.nan)
    
    x_pos = np.arange(len(bloom_labels))
    bars = ax.bar(x_pos, means, yerr=stds, capsize=5, 
                  color=['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'],
                  alpha=0.7, edgecolor='black')
    
    ax.set_xlabel('Bloom Taxonomy Levels', fontsize=12)
    ax.set_ylabel('Mean Score (0-10 Scale)', fontsize=12)
    ax.set_title('Bloom Taxonomy Assessment Scores', fontsize=14, fontweight='bold')
    ax.set_xticks(x_pos)
    ax.set_xticklabels(bloom_labels)
    ax.set_ylim(0, 10)
    ax.grid(axis='y', alpha=0.3)
    
    # 添加数值标签
    for i, (mean, std) in enumerate(zip(means, stds)):
        if not np.isnan(mean):
            ax.text(i, mean + std + 0.2, f'{mean:.2f}', ha='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, 'figure7_bloom_scores.pdf'), dpi=300, bbox_inches='tight')
    plt.savefig(os.path.join(FIGURES_DIR, 'figure7_bloom_scores.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated Figure 7: Bloom Scores")

def main():
    print("Loading data...")
    df = load_data()
    print(f"Loaded {len(df)} participants")
    
    print("\nGenerating figures...")
    figure1_basic_ai_usage(df)
    figure2_user_experience(df)
    figure3_pretest_posttest_comparison(df)
    figure4_nasa_tlx(df)
    figure5_role_preference(df)
    figure6_interaction_bloom_correlation(df)
    figure7_bloom_scores(df)
    
    print(f"\nAll figures saved to: {FIGURES_DIR}")

if __name__ == '__main__':
    main()

