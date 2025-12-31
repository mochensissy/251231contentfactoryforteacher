// 公众号文章API响应类型
export interface WechatArticleResponse {
  code: number;
  cost_money: number;
  cut_words: string;
  data: WechatArticle[];
  data_number: number;
  msg: string;
  page: number;
  remain_money: number;
  total: number;
  total_page: number;
  [property: string]: any;
}

export interface WechatArticle {
  /** 封面 */
  avatar: string;
  /** 分类 */
  classify: string;
  /** 正文 */
  content: string;
  /** 原始id */
  ghid: string;
  /** 发布地址 */
  ip_wording: string;
  /** 是否原创 */
  is_original: number;
  /** 再看数 */
  looking: number;
  /** 点赞数 */
  praise: number;
  /** 发布时间 */
  publish_time: number;
  publish_time_str: string;
  /** 阅读数 */
  read: number;
  /** 文章原始短链接 */
  short_link: string;
  /** 文章标题 */
  title: string;
  /** 更新时间 */
  update_time: number;
  update_time_str: string;
  /** 文章长连接 */
  url: string;
  /** wxid */
  wx_id: string;
  /** 公众号名字 */
  wx_name: string;
  [property: string]: any;
}

// 文章摘要类型
export interface ArticleSummary {
  title: string;
  url: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  highlights: string[];
  contentType: string;
  targetAudience: string;
  writeStyle: string;
}

// 增强的洞察类型
export interface EnhancedInsight {
  title: string;
  category: string;
  description: string;
  targetAudience: string;
  contentAngle: string;
  suggestedOutline: string[];
  referenceArticles: string[];
  confidence: number;
  reasons: string[];
}

// 分析结果类型（保持向后兼容）
export interface AnalysisResult {
  topLikesArticles: {
    title: string;
    likes: number;
    reads: number;
    url: string;
    wxName: string;
  }[];
  topEngagementArticles: {
    title: string;
    engagement: number;
    reads: number;
    url: string;
    wxName: string;
  }[];
  wordCloud: {
    word: string;
    weight: number;
  }[];
  insights: {
    title: string;
    description: string;
  }[];
  // 新增字段
  articleSummaries?: ArticleSummary[];
  enhancedInsights?: EnhancedInsight[];
  // 统计数据（新增）
  readDistribution?: {
    label: string;
    count: number;
    min: number;
    max: number;
  }[];
  timeDistribution?: {
    label: string;
    count: number;
    hour: number;
  }[];
}

// ========== 公众号历史文章相关类型 ==========

// 公众号历史文章 API 响应类型
export interface PostHistoryResponse {
  code: number;
  cost_money: number;
  data: PostHistoryArticle[];
  head_img?: string;
  masssend_count: number;
  mp_ghid?: string;
  mp_nickname?: string;
  mp_wxid?: string;
  msg: string;
  now_page: number;
  now_page_articles_num: number;
  publish_count: number;
  remain_money: number;
  total_num: number;
  total_page: number;
  [property: string]: any;
}

// 公众号历史文章数据项
export interface PostHistoryArticle {
  appmsgid: number;
  /** 文章封面 */
  cover_url: string;
  /** 摘要 */
  digest: string;
  /** 0：正常； 1：已被删除 */
  is_deleted: string;
  /** 0:图文 5:纯视频 7:纯音乐 8:纯图片 10:纯文字 11:转载文章 */
  item_show_type: number;
  /** 文章被删除或者违规的原因 */
  msg_fail_reason: string;
  /** 2：正常； 7：已被删除； 6：文章因违规发送失败 */
  msg_status: number;
  /** 1:原创 0:未声明原创 2:转载 */
  original: number;
  /** 16:9封面 */
  pic_cdn_url_16_9?: string;
  /** 1:1封面 */
  pic_cdn_url_1_1?: string;
  /** 2.35:1的封面 */
  pic_cdn_url_235_1?: string;
  /** 发文位置（头条|二条|三条|四条|五条|六条|七条|八条|） */
  position: number;
  /** 发文时间戳 */
  post_time: number;
  /** 发文时间文本显示方式 */
  post_time_str: string;
  /** 定时发文时间戳 */
  pre_post_time?: number;
  /** 收到群发消息的粉丝数量（发布的文章 或者 发送失败的文章此参数为0） */
  send_to_fans_num?: number;
  /** 文章标题 */
  title: string;
  /** 类型 9 ：群发，有通知，1天发送1次； 类型 1：发布，无通知，无次数限制 */
  types: number;
  update_time: number;
  /** 文章链接 */
  url: string;
  [property: string]: any;
}

// 文章互动数据 API 响应类型
export interface ArticleStatsResponse {
  code: number;
  cost_money: number;
  data: {
    /** 在看 */
    looking: number;
    /** 阅读 */
    read: number;
    /** 点赞 */
    zan: number;
  };
  msg: string;
  remain_money: number;
  [property: string]: any;
}

// 公众号信息
export interface MpInfo {
  nickname: string;
  ghid: string;
  wxid: string;
  headImg: string;
}

// 历史文章查询结果
export interface AccountHistoryData {
  mpInfo: MpInfo;
  allArticles: WechatArticle[];
  top20: WechatArticle[];
  total: number;
  totalPage: number;
  currentPage: number;
}

// 分析任务来源类型
export type AnalysisSourceType = 'keyword' | 'account_history'

// 分析任务完整类型（与数据库对应）
export interface AnalysisTaskWithReport {
  id: number
  keyword: string
  sourceType: AnalysisSourceType
  mpName?: string | null
  mpGhid?: string | null
  status: string
  totalArticles: number | null
  analyzedAt: string | null
  createdAt: string
  report: {
    id: number
    createdAt: string
  } | null
}
