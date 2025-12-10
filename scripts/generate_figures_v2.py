#!/usr/bin/env python3
"""
生成研究结果图表 - 更新版本
使用新的配色方案，修复所有问题
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import os
from scipy import stats

# 使用提供的配色方案
# DeepSeek-CN: dark gray, DeepSeek-EN: light gray
# GPT-4-CN: light beige/yellow, GPT-4-EN: lighter beige/yellow  
# Gemini2.5-CN: orange, Gemini2.5-EN: light orange
COLORS = {
    'deepseek_cn': '#4A4A4A',      # Dark gray
    'deepseek_en': '#8A8A8A',      # Light gray
    'gpt4_cn': '#D4A574',          # Light beige/yellow
    'gpt4_en': '#E8C99B',          # Lighter beige/yellow
    'gemini_cn': '#FF8C42',        # Orange
    'gemini_en': '#FFB366',        # Light orange
    'primary': '#3498db',          # Blue for primary data
    'secondary': '#2ecc71',        # Green for secondary
    'accent': '#e74c3c',           # Red for accent
}

# 设置样式
plt.rcParams['font.sans-serif'] = ['Arial', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
sns.set_style("whitegrid")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_FILE = os.path.join(BASE_DIR, 'public', 'data', 'analysis_summary_complete.csv')
FIGURES_DIR = os.path.join(BASE_DIR, 'public', 'data', 'figures')

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
    
    return df

def figure1_basic_ai_usage(df):
    """Figure 1: 基础AI使用情况 - 频次和使用目的在一张图"""
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    
    # Q2: AI使用频率 - 添加说明
    q2_mapping = {'A': 'Frequent (Daily)', 'B': 'Occasional (Weekly)', 'C': 'Rare (Monthly)'}
    q2_counts = df['前测_Q2_AI使用频率'].value_counts().sort_index()
    
    bars1 = axes[0].bar(range(len(q2_counts)), q2_counts.values, 
                        color=[COLORS['deepseek_cn'], COLORS['gpt4_cn'], COLORS['gemini_cn']][:len(q2_counts)],
                        alpha=0.8, edgecolor='black', linewidth=1.5)
    axes[0].set_xticks(range(len(q2_counts)))
    axes[0].set_xticklabels([q2_mapping.get(k, k) for k in q2_counts.index], rotation=15, ha='right')
    axes[0].set_ylabel('Number of Participants', fontsize=11, fontweight='bold')
    axes[0].set_title('(a) AI Usage Frequency', fontsize=12, fontweight='bold')
    axes[0].grid(axis='y', alpha=0.3, linestyle='--')
    
    # 添加数值标签
    for bar in bars1:
        height = bar.get_height()
        axes[0].text(bar.get_x() + bar.get_width()/2., height,
                    f'{int(height)}', ha='center', va='bottom', fontsize=10, fontweight='bold')
    
    # Q3: AI使用目的（多选）
    q3_data = []
    for val in df['前测_Q3_AI使用目的'].dropna():
        purposes = str(val).split('|')
        q3_data.extend([p.strip() for p in purposes if p.strip()])
    
    q3_counts = pd.Series(q3_data).value_counts()
    bars2 = axes[1].barh(range(len(q3_counts)), q3_counts.values, 
                        color=COLORS['primary'], alpha=0.8, edgecolor='black', linewidth=1.5)
    axes[1].set_yticks(range(len(q3_counts)))
    axes[1].set_yticklabels(q3_counts.index, fontsize=10)
    axes[1].set_xlabel('Number of Participants', fontsize=11, fontweight='bold')
    axes[1].set_title('(b) AI Usage Purposes', fontsize=12, fontweight='bold')
    axes[1].grid(axis='x', alpha=0.3, linestyle='--')
    
    # 添加数值标签
    for i, bar in enumerate(bars2):
        width = bar.get_width()
        axes[1].text(width, bar.get_y() + bar.get_height()/2.,
                    f' {int(width)}', ha='left', va='center', fontsize=10, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, 'figure1_basic_ai_usage.pdf'), dpi=300, bbox_inches='tight')
    plt.savefig(os.path.join(FIGURES_DIR, 'figure1_basic_ai_usage.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated Figure 1: Basic AI Usage")

def figure2_user_experience(df):
    """Figure 2: 用户体验评分"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
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
    bars = ax.bar(x_pos, means, yerr=stds, capsize=5, 
                  color=COLORS['primary'], alpha=0.8, edgecolor='black', linewidth=1.5)
    
    ax.set_xlabel('User Experience Dimensions', fontsize=12, fontweight='bold')
    ax.set_ylabel('Mean Score (1-5 Likert Scale)', fontsize=12, fontweight='bold')
    ax.set_title('User Experience Ratings', fontsize=14, fontweight='bold')
    ax.set_xticks(x_pos)
    ax.set_xticklabels(exp_labels, rotation=45, ha='right')
    ax.set_ylim(0, 5.5)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.axhline(y=3, color='red', linestyle='--', alpha=0.5, linewidth=2, label='Neutral (3)')
    ax.legend(fontsize=10)
    
    # 添加数值标签
    for i, (mean, std) in enumerate(zip(means, stds)):
        ax.text(i, mean + std + 0.15, f'{mean:.2f}', ha='center', fontsize=9, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, 'figure2_user_experience.pdf'), dpi=300, bbox_inches='tight')
    plt.savefig(os.path.join(FIGURES_DIR, 'figure2_user_experience.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated Figure 2: User Experience")

def figure3_nasa_comparison(df):
    """Figure 3: NASA-TLX前后测对比 - 每个问题的前后均分左右放到一起"""
    fig, ax = plt.subplots(figsize=(12, 7))
    
    # 前测Q4-Q9对应NASA的6个维度（心理需求、生理需求、时间需求、表现、努力程度、挫败感）
    pretest_cols = ['前测_Q4', '前测_Q5', '前测_Q6', '前测_Q7', '前测_Q8', '前测_Q9']
    posttest_cols = ['后测_Q15_心理需求', '后测_Q16_生理需求', '后测_Q17_时间需求',
                     '后测_Q18_表现', '后测_Q19_努力程度', '后测_Q20_挫败感']
    nasa_labels = ['Mental\nDemand', 'Physical\nDemand', 'Temporal\nDemand',
                   'Performance', 'Effort', 'Frustration']
    
    # 提取有效数据
    pretest_means = []
    pretest_stds = []
    posttest_means = []
    posttest_stds = []
    
    for pretest_col, posttest_col in zip(pretest_cols, posttest_cols):
        pretest_vals = df[pretest_col].dropna()
        posttest_vals = df[posttest_col].dropna()
        
        if len(pretest_vals) > 0:
            pretest_means.append(pretest_vals.mean())
            pretest_stds.append(pretest_vals.std())
        else:
            pretest_means.append(np.nan)
            pretest_stds.append(np.nan)
        
        if len(posttest_vals) > 0:
            posttest_means.append(posttest_vals.mean())
            posttest_stds.append(posttest_vals.std())
        else:
            posttest_means.append(np.nan)
            posttest_stds.append(np.nan)
    
    x = np.arange(len(nasa_labels))
    width = 0.35
    
    # 绘制前测和后测的条形图
    bars1 = ax.bar(x - width/2, pretest_means, width, yerr=pretest_stds, 
                   label='Pre-test (General AI)', color=COLORS['deepseek_cn'], 
                   alpha=0.8, edgecolor='black', linewidth=1.5, capsize=5)
    bars2 = ax.bar(x + width/2, posttest_means, width, yerr=posttest_stds,
                   label='Post-test (Multi-agent)', color=COLORS['gemini_cn'],
                   alpha=0.8, edgecolor='black', linewidth=1.5, capsize=5)
    
    ax.set_xlabel('NASA-TLX Dimensions', fontsize=12, fontweight='bold')
    ax.set_ylabel('Mean Score (1-5 Scale)', fontsize=12, fontweight='bold')
    ax.set_title('NASA-TLX Cognitive Load: Pre-test vs Post-test Comparison', fontsize=14, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(nasa_labels, fontsize=10)
    ax.set_ylim(0, 5.5)
    ax.legend(fontsize=11, loc='upper right')
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    
    # 添加数值标签
    for bars in [bars1, bars2]:
        for bar in bars:
            height = bar.get_height()
            if not np.isnan(height):
                ax.text(bar.get_x() + bar.get_width()/2., height + 0.1,
                       f'{height:.2f}', ha='center', va='bottom', fontsize=9, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, 'figure3_nasa_comparison.pdf'), dpi=300, bbox_inches='tight')
    plt.savefig(os.path.join(FIGURES_DIR, 'figure3_nasa_comparison.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated Figure 3: NASA-TLX Comparison")

def figure4_role_usage(df):
    """Figure 4: 教师vs同伴智能体的使用频率和时长 - 基于会话日志数据"""
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # 提取有会话数据的用户
    valid = df[(df['会话总轮次'].notna()) & (df['会话总轮次'] > 0)].copy()
    
    if len(valid) > 0:
        # 左图：使用频率（轮次）
        teacher_turns = valid['教师轮次'].dropna()
        peer_turns = valid['同伴轮次'].dropna()
        
        x = np.arange(len(valid))
        width = 0.35
        
        bars1 = axes[0].bar(x - width/2, teacher_turns.values, width,
                           label='Teacher Agent', color=COLORS['primary'],
                           alpha=0.8, edgecolor='black', linewidth=1.5)
        bars2 = axes[0].bar(x + width/2, peer_turns.values, width,
                           label='Peer Agent', color=COLORS['secondary'],
                           alpha=0.8, edgecolor='black', linewidth=1.5)
        
        axes[0].set_xlabel('Participant', fontsize=11, fontweight='bold')
        axes[0].set_ylabel('Number of Turns', fontsize=11, fontweight='bold')
        axes[0].set_title('(a) Agent Usage Frequency (Turns)', fontsize=12, fontweight='bold')
        axes[0].set_xticks(x)
        axes[0].set_xticklabels(valid['用户ID'].values, rotation=45, ha='right')
        axes[0].legend(fontsize=10)
        axes[0].grid(axis='y', alpha=0.3, linestyle='--')
        
        # 右图：使用时长（如果有数据）
        # 这里需要从会话日志中提取，暂时用轮次比例估算
        total_turns = valid['会话总轮次'].values
        teacher_ratio = teacher_turns.values / total_turns
        peer_ratio = peer_turns.values / total_turns
        
        bars3 = axes[1].bar(x - width/2, teacher_ratio, width,
                           label='Teacher Agent', color=COLORS['primary'],
                           alpha=0.8, edgecolor='black', linewidth=1.5)
        bars4 = axes[1].bar(x + width/2, peer_ratio, width,
                           label='Peer Agent', color=COLORS['secondary'],
                           alpha=0.8, edgecolor='black', linewidth=1.5)
        
        axes[1].set_xlabel('Participant', fontsize=11, fontweight='bold')
        axes[1].set_ylabel('Proportion of Total Turns', fontsize=11, fontweight='bold')
        axes[1].set_title('(b) Agent Usage Proportion', fontsize=12, fontweight='bold')
        axes[1].set_xticks(x)
        axes[1].set_xticklabels(valid['用户ID'].values, rotation=45, ha='right')
        axes[1].legend(fontsize=10)
        axes[1].grid(axis='y', alpha=0.3, linestyle='--')
        axes[1].set_ylim(0, 1)
    
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, 'figure4_role_usage.pdf'), dpi=300, bbox_inches='tight')
    plt.savefig(os.path.join(FIGURES_DIR, 'figure4_role_usage.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated Figure 4: Role Usage")

def figure5_role_preference_scores(df):
    """Figure 5: 角色偏好评分（后测Q5, Q6, Q7, Q10）"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    role_cols = ['后测_Q5_教师使用频率', '后测_Q6_同伴使用频率', 
                 '后测_Q7_角色切换频率', '后测_Q10_角色偏好']
    role_labels = ['Q5: Teacher\nFrequency', 'Q6: Peer\nFrequency', 
                   'Q7: Role\nSwitching', 'Q10: Role\nPreference']
    
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
                  color=[COLORS['primary'], COLORS['secondary'], COLORS['accent'], COLORS['gpt4_cn']],
                  alpha=0.8, edgecolor='black', linewidth=1.5)
    
    ax.set_xlabel('Role Preference Dimensions', fontsize=12, fontweight='bold')
    ax.set_ylabel('Mean Score (1-5 Likert Scale)', fontsize=12, fontweight='bold')
    ax.set_title('Role Preference Ratings (Post-test Q5, Q6, Q7, Q10)', fontsize=14, fontweight='bold')
    ax.set_xticks(x_pos)
    ax.set_xticklabels(role_labels)
    ax.set_ylim(0, 5.5)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    
    # 添加数值标签
    for i, (mean, std) in enumerate(zip(means, stds)):
        if not np.isnan(mean):
            ax.text(i, mean + std + 0.15, f'{mean:.2f}', ha='center', fontsize=10, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, 'figure5_role_preference_scores.pdf'), dpi=300, bbox_inches='tight')
    plt.savefig(os.path.join(FIGURES_DIR, 'figure5_role_preference_scores.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated Figure 5: Role Preference Scores")

def figure6_interaction_bloom_correlation(df):
    """Figure 6: 互动量与Bloom得分相关分析"""
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    axes = axes.flatten()
    
    valid = df[(df['会话总轮次'].notna()) & (df['会话总轮次'] > 0) & 
               (df['Bloom_记忆_得分'].notna())].copy()
    
    if len(valid) < 3:
        print("Warning: Insufficient data for correlation plots")
        return
    
    # 计算Bloom总分
    bloom_cols = ['Bloom_记忆_得分', 'Bloom_理解_得分', 'Bloom_应用_得分',
                  'Bloom_分析_得分', 'Bloom_评估_得分', 'Bloom_创造_得分']
    valid['Bloom总分'] = valid[bloom_cols].sum(axis=1)
    
    interaction_vars = [
        ('会话总轮次', 'Total Turns', axes[0]),
        ('教师轮次', 'Teacher Turns', axes[1]),
        ('同伴轮次', 'Peer Turns', axes[2]),
        ('角色切换次数', 'Role Switches', axes[3]),
        ('会话时长(分钟)', 'Session Duration (min)', axes[4]),
    ]
    
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
                ax.scatter(x_common, y_common, alpha=0.7, s=120, 
                          color=COLORS['primary'], edgecolors='black', linewidth=1.5)
                
                # 拟合线
                z = np.polyfit(x_common, y_common, 1)
                p = np.poly1d(z)
                ax.plot(x_common, p(x_common), "r--", alpha=0.8, linewidth=2.5)
                
                # 计算相关系数
                corr_coef, p_value = stats.pearsonr(x_common, y_common)
                correlations.append(corr_coef)
                p_values.append(p_value)
                var_names.append(var_label)
                
                ax.set_xlabel(var_label, fontsize=10, fontweight='bold')
                ax.set_ylabel('Bloom Total Score', fontsize=10, fontweight='bold')
                ax.set_title(f'r = {corr_coef:.3f}, p = {p_value:.3f}', fontsize=10, fontweight='bold')
                ax.grid(alpha=0.3, linestyle='--')
    
    # 汇总图
    if correlations:
        colors_bar = ['green' if p < 0.05 else 'orange' for p in p_values]
        bars = ax_summary.barh(var_names, correlations, color=colors_bar, 
                              alpha=0.8, edgecolor='black', linewidth=1.5)
        ax_summary.set_xlabel('Pearson Correlation Coefficient', fontsize=11, fontweight='bold')
        ax_summary.set_title('Summary: Correlation Coefficients', fontsize=12, fontweight='bold')
        ax_summary.axvline(x=0, color='black', linestyle='-', linewidth=1)
        ax_summary.grid(axis='x', alpha=0.3, linestyle='--')
        ax_summary.set_xlim(-1, 1)
        
        for i, (corr, p) in enumerate(zip(correlations, p_values)):
            ax_summary.text(corr + 0.05 if corr > 0 else corr - 0.05, i,
                          f'{corr:.3f} (p={p:.3f})', va='center', fontsize=9, fontweight='bold')
    
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
                  color=[COLORS['deepseek_cn'], COLORS['gpt4_cn'], COLORS['gemini_cn'],
                         COLORS['primary'], COLORS['secondary'], COLORS['accent']],
                  alpha=0.8, edgecolor='black', linewidth=1.5)
    
    ax.set_xlabel('Bloom Taxonomy Levels', fontsize=12, fontweight='bold')
    ax.set_ylabel('Mean Score (0-10 Scale)', fontsize=12, fontweight='bold')
    ax.set_title('Bloom Taxonomy Assessment Scores', fontsize=14, fontweight='bold')
    ax.set_xticks(x_pos)
    ax.set_xticklabels(bloom_labels, fontsize=10)
    ax.set_ylim(0, 10)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    
    # 添加数值标签
    for i, (mean, std) in enumerate(zip(means, stds)):
        if not np.isnan(mean):
            ax.text(i, mean + std + 0.3, f'{mean:.2f}', ha='center', fontsize=10, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, 'figure7_bloom_scores.pdf'), dpi=300, bbox_inches='tight')
    plt.savefig(os.path.join(FIGURES_DIR, 'figure7_bloom_scores.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated Figure 7: Bloom Scores")

def main():
    print("Loading data...")
    df = load_data()
    print(f"Loaded {len(df)} participants")
    
    print("\nGenerating figures with new color scheme...")
    figure1_basic_ai_usage(df)
    figure2_user_experience(df)
    figure3_nasa_comparison(df)
    figure4_role_usage(df)
    figure5_role_preference_scores(df)
    figure6_interaction_bloom_correlation(df)
    figure7_bloom_scores(df)
    
    print(f"\nAll figures saved to: {FIGURES_DIR}")

if __name__ == '__main__':
    main()

