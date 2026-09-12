# =====================================================================
# 数据预处理全流程基础模板（R 语言）
# 使用方式：复制本模板并按需定制（改用户可配置区、按数据适配每步代码），
# 禁止每次从零生成大段 R 代码。
# 配套说明：SKILL.md（协议） + references/preprocess-detail.md（每步细节）
# =====================================================================

# ===== 用户可配置区 =====
# 路径（默认自动探测：以脚本所在目录为基准；找不到时打印清晰指引）
DATA_PATH <- "data/raw.csv"        # TODO: 你的数据文件（CSV/XLSX/MAT）
OUT_DIR   <- "results/数据预处理结果"  # 过程表格输出目录（UTF-8 with BOM CSV）
FIG_DIR   <- "figures/数据预处理"     # 图片输出目录（PNG 300dpi + SVG）
PROJECT_ROOT <- getwd()            # 默认当前工作目录，可改

# 模式与步骤（FULL=全流程；LOCAL=只执行指定步骤；SCRIPT_ONLY=仅生成脚本）
MODE  <- "FULL"
STEPS <- 1:10                      # LOCAL 模式示例：STEPS <- c(3, 5)
INTERACTIVE <- TRUE                # TRUE=关键决策点暂停等待确认（无交互环境设 FALSE 并记录假设）

# 阈值（默认值，按领域可覆盖；交付时写明 默认值 vs 实际采用值 vs 理由）
VIF_THRESHOLD    <- 10             # 多重共线性判定
SKEW_THRESHOLD   <- 1              # |偏度| 超此值需变换
IQR_MULT         <- 1.5            # IQR 异常规则倍数
MAD_MULT         <- 3              # MAD 稳健异常规则倍数
PCA_VAR_EXPLAINED <- 0.80          # PCA 累计解释率建议线

# 数据列约定（按实际数据修改）
ID_COLS     <- c()                 # 主键/ID 列
TIME_COL    <- NULL                # 时间列名（非时序置 NULL）
GROUP_COLS  <- c()                 # 分组/分层维度列
TARGET_COL  <- NULL                # 目标列（划分/分层用）
CAT_COLS    <- c()                 # 分类列
NUM_COLS    <- c()                 # 数值列（NULL 表示自动探测）
# ===== 用户可配置区结束 =====

# ---------------------------------------------------------------------
# 工具函数区（一般无需修改）
# ---------------------------------------------------------------------
library(dplyr); library(tidyr); library(ggplot2); library(stringr); library(gridExtra)
# 按需加载：readxl(Excel) car(VIF/Box-Cox) tseries(ADF) zoo(插值) mice(多重插补)
#           forecast(ndiffs) bestNormalize fastDummies corrplot

if (!dir.exists(OUT_DIR)) dir.create(OUT_DIR, recursive = TRUE)
if (!dir.exists(FIG_DIR)) dir.create(FIG_DIR, recursive = TRUE)

# 写 UTF-8 with BOM CSV（先写无 BOM 临时文件，再前置 EF BB BF，避免中文乱码）
write_csv_bom <- function(df, file) {
  tmp <- paste0(file, ".tmp")
  utils::write.csv(df, tmp, row.names = FALSE, fileEncoding = "UTF-8")
  con <- file(file, "wb")
  writeBin(charToRaw("\ufeff"), con, endian = "little")
  writeLines(readLines(tmp, encoding = "UTF-8", warn = FALSE), con, useBytes = TRUE)
  close(con); unlink(tmp)
}

# 出版级 ggplot 主题（theme_bw + 中文字体回退）
theme_publication <- function() {
  f <- if (Sys.info()["sysname"] == "Windows") "Microsoft YaHei" else "SimHei"
  theme_bw(base_size = 12) +
    theme(plot.title = element_text(hjust = 0.5, face = "bold"),
          legend.position = "bottom", panel.grid.minor = element_blank())
}

save_fig <- function(p, name) {
  ggsave(file.path(FIG_DIR, paste0(name, ".png")), p, width = 8, height = 5, dpi = 300)
  ggsave(file.path(FIG_DIR, paste0(name, ".svg")), p, width = 8, height = 5)
}

# 偏度/峰度诊断（对数值列）
skew_kurt <- function(x) {
  n <- length(x); m <- mean(x, na.rm = TRUE); s <- sd(x, na.rm = TRUE)
  if (s == 0 || is.na(s)) return(c(skew = NA, kurt = NA))
  z <- (x - m) / s
  c(skew = mean(z^3, na.rm = TRUE), kurt = mean(z^4, na.rm = TRUE) - 3)
}

# VIF（手写 1/(1-R^2)）
vif_manual <- function(df) {
  X <- df %>% select(where(is.numeric)) %>% na.omit()
  out <- sapply(names(X), function(v) {
    f <- as.formula(paste(v, "~ ."))
    fit <- lm(f, data = X)
    1 / (1 - summary(fit)$r.squared)
  })
  data.frame(variable = names(out), vif = unname(out))
}

# 异常标记：IQR + MAD 双规则 + 领域范围（outside_range 可选）
flag_outliers <- function(x, iqr_mult = IQR_MULT, mad_mult = MAD_MULT, outside_range = NULL) {
  q <- quantile(x, c(0.25, 0.75), na.rm = TRUE); iqr <- unname(q[2] - q[1])
  med <- median(x, na.rm = TRUE)
  iqr_lo <- q[1] - iqr_mult * iqr; iqr_hi <- q[2] + iqr_mult * iqr
  mad_lo <- med - mad_mult * mad(x, na.rm = TRUE); mad_hi <- med + mad_mult * mad(x, na.rm = TRUE)
  out <- (x < min(iqr_lo, mad_lo) | x > max(iqr_hi, mad_hi)) %in% TRUE
  if (!is.null(outside_range)) out <- out | (x < outside_range[1] | x > outside_range[2])
  out
}

# One-Hot（无序分类）
one_hot <- function(df, cols) {
  for (v in cols) {
    for (lvl in sort(unique(df[[v]]))) {
      if (is.na(lvl)) next
      df[[paste0(v, "_", make.names(lvl))]] <- as.integer(df[[v]] == lvl & !is.na(df[[v]]))
    }
  }
  df
}

# ---------------------------------------------------------------------
# 第 1 步：数据分布情况
# ---------------------------------------------------------------------
step1_distribution <- function(df) {
  cols <- if (length(NUM_COLS)) NUM_COLS else names(df)[vapply(df, is.numeric, logical(1))]
  diag <- data.frame(variable = cols,
                     t(vapply(df[cols], function(x) skew_kurt(x), numeric(2))))
  write_csv_bom(diag, file.path(OUT_DIR, "step1_分布诊断_偏度峰度.csv"))
  for (v in cols) {
    p <- ggplot(df, aes(.data[[v]])) + geom_histogram(bins = 30, fill = "#4C72B0", alpha = .8) +
      ggtitle(paste("分布：", v)) + theme_publication()
    save_fig(p, paste0("step1_hist_", v))
  }
  diag
}

# ---------------------------------------------------------------------
# 第 2 步：描述性统计与交叉表
# ---------------------------------------------------------------------
step2_descriptive <- function(df) {
  num_cols <- names(df)[vapply(df, is.numeric, logical(1))]
  stats <- df %>% summarise(across(all_of(num_cols), list(
    n = ~sum(!is.na(.)), missing = ~sum(is.na(.)), mean = ~mean(., na.rm = TRUE),
    sd = ~sd(., na.rm = TRUE), median = ~median(., na.rm = TRUE),
    q25 = ~quantile(., .25, na.rm = TRUE), q75 = ~quantile(., .75, na.rm = TRUE),
    skew = ~{ z <- (. - mean(., na.rm = TRUE)) / sd(., na.rm = TRUE); mean(z^3, na.rm = TRUE) },
    kurt = ~{ z <- (. - mean(., na.rm = TRUE)) / sd(., na.rm = TRUE); mean(z^4, na.rm = TRUE) - 3 }))) %>%
    pivot_longer(everything(), names_to = "var_stat", values_to = "value") %>%
    separate(var_stat, c("variable", "stat"), sep = "_(?=[a-z]+$)")
  write_csv_bom(stats, file.path(OUT_DIR, "step2_描述统计.csv"))
  # 分类变量两两交叉表（示例：GROUP_COLS 前两个）
  if (length(GROUP_COLS) >= 2) {
    ct <- as.data.frame(table(df[[GROUP_COLS[1]]], df[[GROUP_COLS[2]]], useNA = "ifany"))
    names(ct) <- c(GROUP_COLS[1:2], "n")
    write_csv_bom(ct, file.path(OUT_DIR, "step2_交叉表.csv"))
    p <- ggplot(ct, aes(.data[[GROUP_COLS[1]]], .data[[GROUP_COLS[2]]], fill = n)) +
      geom_tile() + scale_fill_viridis_c() + ggtitle("交叉表热力图") + theme_publication()
    save_fig(p, "step2_crosstab")
  }
  stats
}

# ---------------------------------------------------------------------
# 第 3 步：数据清洗（缺失 / 异常 / 一致性）
# ---------------------------------------------------------------------
step3_clean <- function(df) {
  # 缺失统计
  miss <- data.frame(variable = names(df), missing = colSums(is.na(df)), pct = colMeans(is.na(df)))
  write_csv_bom(miss, file.path(OUT_DIR, "step3_缺失统计.csv"))
  # 缺失填补（示例：数值列中位数；决策点需用户确认方案）
  if (any(miss$missing > 0) && INTERACTIVE) {
    cat("[交互] 缺失列：", paste(miss$variable[miss$missing > 0], collapse = ", "),
        "\n请确认填补方案：1)中位数 2)插值 3)MICE 4)删除行\n")
    ans <- readline("选择 (1-4，默认 1): "); if (ans == "") ans <- "1"
    # TODO: 按 ans 执行对应填补
  }
  for (v in miss$variable[miss$missing > 0]) {
    if (is.numeric(df[[v]])) df[[v]][is.na(df[[v]])] <- median(df[[v]], na.rm = TRUE)
  }
  # 异常标记（示例：数值列，IQR+MAD；删除前必须给依据并确认）
  out_rows <- logical(nrow(df))
  for (v in names(df)[vapply(df, is.numeric, logical(1))]) {
    f <- flag_outliers(df[[v]])
    if (any(f)) out_rows <- out_rows | f
  }
  detail <- data.frame(row = which(out_rows), flag = "IQR|MAD")
  write_csv_bom(detail, file.path(OUT_DIR, "step3_异常标记明细.csv"))
  # 决策点：异常删除 vs 保留（统计异常但业务正常 → 标记不删除）
  if (any(out_rows) && INTERACTIVE) {
    cat("[交互] 共标记 ", sum(out_rows), " 行异常，请确认：1)保留(仅标记) 2)删除 3)缩尾\n")
    readline("选择 (1-3，默认 1): ")
  }
  # TODO: 一致性校验（跨表引用、单位、物理/业务平衡）按数据实现
  df
}

# ---------------------------------------------------------------------
# 第 4 步：数据变换（按需，防泄漏）
# ---------------------------------------------------------------------
step4_transform <- function(df) {
  cols <- names(df)[vapply(df, is.numeric, logical(1))]
  dec <- data.frame()
  for (v in cols) {
    sk <- skew_kurt(df[[v]])[["skew"]]
    method <- "none"; newv <- df[[v]]
    if (!is.na(sk) && abs(sk) > SKEW_THRESHOLD) {
      method <- ifelse(sk > 0, "log1p", "Yeo-Johnson")  # 训练集拟合、测试集映射（防泄漏）
      if (method == "log1p") newv <- log1p(df[[v]])
    }
    df[[paste0(v, "_tr")]] <- newv
    dec <- rbind(dec, data.frame(variable = v, orig_skew = sk, method = method,
                                 after_skew = skew_kurt(newv)[["skew"]], threshold = SKEW_THRESHOLD))
    if (method != "none") {
      p <- ggplot(df, aes(x = .data[[v]])) + geom_density(fill = "#55A868", alpha = .6) +
        ggtitle(paste(v, "变换前")) + theme_publication()
      p2 <- ggplot(df, aes(x = .data[[paste0(v, "_tr")]])) + geom_density(fill = "#C44E52", alpha = .6) +
        ggtitle(paste(v, "变换后:", method)) + theme_publication()
      save_fig(grid.arrange(p, p2, ncol = 2), paste0("step4_", v, "_前后"))
    }
  }
  write_csv_bom(dec, file.path(OUT_DIR, "step4_变换决策.csv"))
  df
}

# ---------------------------------------------------------------------
# 第 5 步：变量编码与重赋值
# ---------------------------------------------------------------------
step5_encode <- function(df) {
  # 重命名（示例：规范化列名）
  # df <- df %>% rename_with(~ make.names(.x))
  mapping <- data.frame(original = character(), new = character())
  # TODO: 按数据实现重赋值/编码；取值歧义时停顿询问
  if (length(CAT_COLS)) df <- one_hot(df, CAT_COLS)
  write_csv_bom(mapping, file.path(OUT_DIR, "step5_编码映射表.csv"))
  df
}

# ---------------------------------------------------------------------
# 第 6 步：衍生变量与分组分层
# ---------------------------------------------------------------------
step6_derive <- function(df) {
  # 示例衍生：平方项 / 交互项 / 业务特征（按题目机理实现，禁止无意义堆特征）
  # df <- df %>% mutate(x2 = x^2, interaction = a * b)
  if (length(GROUP_COLS)) {
    g <- df %>% group_by(across(all_of(GROUP_COLS))) %>%
      summarise(n = n(), .groups = "drop")
    write_csv_bom(g, file.path(OUT_DIR, "step6_分组统计.csv"))
  }
  df
}

# ---------------------------------------------------------------------
# 第 7 步：平稳性检验（非时序跳过）
# ---------------------------------------------------------------------
step7_stationarity <- function(df) {
  if (is.null(TIME_COL) || !TIME_COL %in% names(df)) {
    writeLines("第 7 步跳过：非时间序列数据（原因：无时间列）。", file.path(OUT_DIR, "step7_跳过说明.txt"))
    return(df)
  }
  # library(tseries)
  # res <- adf.test(df[[TIME_COL]]); 不平稳 → 差分/季节分解（决策点确认）
  df
}

# ---------------------------------------------------------------------
# 第 8 步：多重共线性与降维
# ---------------------------------------------------------------------
step8_collinearity <- function(df) {
  v <- vif_manual(df)
  v$severe <- v$vif > VIF_THRESHOLD
  write_csv_bom(v, file.path(OUT_DIR, "step8_VIF.csv"))
  p <- ggplot(v, aes(reorder(variable, vif), vif)) + geom_col(fill = "#4C72B0") +
    geom_hline(yintercept = VIF_THRESHOLD, linetype = 2, color = "red") +
    coord_flip() + ggtitle(paste("VIF（阈值", VIF_THRESHOLD, "）")) + theme_publication()
  save_fig(p, "step8_vif")
  # PCA（scale=TRUE；训练集拟合、测试集映射——防泄漏）
  # pca <- prcomp(df[num_cols], scale. = TRUE)
  # write_csv_bom(方差解释表, file.path(OUT_DIR, "step8_PCA_方差解释.csv"))
  # write_csv_bom(载荷表, file.path(OUT_DIR, "step8_PCA_载荷.csv"))
  df
}

# ---------------------------------------------------------------------
# 第 9 步：数据集划分（如需）
# ---------------------------------------------------------------------
step9_split <- function(df) {
  if (is.null(TIME_COL) || !TIME_COL %in% names(df)) {
    # 非时序：分层抽样（按 TARGET_COL 保持比例）；防组泄漏说明
    # idx <- createDataPartition(df[[TARGET_COL]], p = .7, list = FALSE)
    return(df)
  }
  # 时序：按时间顺序划分（示例：训练 0-2351 / 验证 2352-2375 / 测试 2376-2399）
  # train <- df %>% filter(hour <= 2351); valid <- df %>% filter(hour >= 2352 & hour <= 2375); test <- df %>% filter(hour >= 2376)
  df
}

# ---------------------------------------------------------------------
# 第 10 步：验证处理结果
# ---------------------------------------------------------------------
step10_validate <- function(df) {
  # 清洗前后对比、变换前后偏度对比、划分各集统计、降维后 VIF 复检
  # 可选：shapiro.test / car::leveneTest / 敏感性分析
  df
}

# ---------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------
if (MODE == "SCRIPT_ONLY") {
  cat("脚本交付模式：请在本地安装 R 后运行本脚本，并按回传要求返回结果。\n")
  quit("no")
}
df <- read.csv(DATA_PATH, fileEncoding = "UTF-8-BOM", check.names = FALSE)  # TODO: 适配 XLSX(readxl)/MAT
for (s in STEPS) {
  fn <- switch(as.character(s), "1" = step1_distribution, "2" = step2_descriptive,
               "3" = step3_clean, "4" = step4_transform, "5" = step5_encode,
               "6" = step6_derive, "7" = step7_stationarity, "8" = step8_collinearity,
               "9" = step9_split, "10" = step10_validate)
  cat("== 第", s, "步 ==\n"); df <- fn(df)
}
cat("全部完成。产物位于:", OUT_DIR, "与", FIG_DIR, "\n")
