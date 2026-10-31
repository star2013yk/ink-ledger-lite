import type { Account, Category, SysSettingItem, Tag, Transaction } from '@/types'

/** 示例数据版本：结构变化时可让旧数据自动重建（当前不做强制迁移，仅记录） */
export const SEED_VERSION = 2

/** 初始账户：现金、银行卡、微信（余额 5000） */
export const seedAccounts: Account[] = [
  { id: 1, name: '现金', type: 'CASH', currency: 'CNY', initialBalance: 0, balance: 0, archived: false, icon: 'Banknote' },
  { id: 2, name: '银行卡', type: 'BANK', currency: 'CNY', initialBalance: 0, balance: 0, archived: false, icon: 'Landmark' },
  { id: 3, name: '微信', type: 'WECHAT', currency: 'CNY', initialBalance: 5000, balance: 5000, archived: false, icon: 'MessageCircle' },
]

export const seedCategories: Category[] = [
  { id: 1, parentId: null, kind: 'EXPENSE', name: '餐饮', icon: 'Utensils', archived: false },
  { id: 2, parentId: 1, kind: 'EXPENSE', name: '早餐', icon: 'Croissant', archived: false },
  { id: 3, parentId: 1, kind: 'EXPENSE', name: '午餐', icon: 'Sandwich', archived: false },
  { id: 4, parentId: 1, kind: 'EXPENSE', name: '晚餐', icon: 'Soup', archived: false },
  { id: 5, parentId: 1, kind: 'EXPENSE', name: '外卖', icon: 'Package', archived: false },
  { id: 6, parentId: 1, kind: 'EXPENSE', name: '奶茶', icon: 'CupSoda', archived: false },
  { id: 7, parentId: 1, kind: 'EXPENSE', name: '聚餐', icon: 'PartyPopper', archived: false },

  { id: 8, parentId: null, kind: 'EXPENSE', name: '出行', icon: 'Plane', archived: false },
  { id: 9, parentId: 8, kind: 'EXPENSE', name: '宾馆', icon: 'Hotel', archived: false },

  { id: 10, parentId: null, kind: 'EXPENSE', name: '交通', icon: 'Bus', archived: false },
  { id: 11, parentId: 10, kind: 'EXPENSE', name: '地铁充值', icon: 'TrainFront', archived: false },
  { id: 12, parentId: 10, kind: 'EXPENSE', name: '共享单车', icon: 'Bike', archived: false },
  { id: 13, parentId: 10, kind: 'EXPENSE', name: '打车', icon: 'Car', archived: false },
  { id: 14, parentId: 10, kind: 'EXPENSE', name: '高铁', icon: 'Train', archived: false },

  { id: 15, parentId: null, kind: 'EXPENSE', name: '购物', icon: 'ShoppingBag', archived: false },
  { id: 16, parentId: 15, kind: 'EXPENSE', name: '淘宝', icon: 'ShoppingCart', archived: false },
  { id: 17, parentId: 15, kind: 'EXPENSE', name: '京东', icon: 'Package', archived: false },
  { id: 18, parentId: 15, kind: 'EXPENSE', name: '拼夕夕', icon: 'Store', archived: false },
  { id: 19, parentId: 15, kind: 'EXPENSE', name: '超市消费', icon: 'Apple', archived: false },
  { id: 20, parentId: 15, kind: 'EXPENSE', name: '商场消费', icon: 'Building2', archived: false },

  { id: 21, parentId: null, kind: 'EXPENSE', name: '娱乐', icon: 'Film', archived: false },
  { id: 22, parentId: 21, kind: 'EXPENSE', name: '游戏', icon: 'Gamepad2', archived: false },
  { id: 23, parentId: 21, kind: 'EXPENSE', name: '旅游', icon: 'Luggage', archived: false },

  { id: 24, parentId: null, kind: 'EXPENSE', name: '医疗', icon: 'HeartPulse', archived: false },
  { id: 25, parentId: 24, kind: 'EXPENSE', name: '药店', icon: 'Pill', archived: false },
  { id: 26, parentId: 24, kind: 'EXPENSE', name: '药材', icon: 'Leaf', archived: false },

  { id: 27, parentId: null, kind: 'EXPENSE', name: '生活', icon: 'Home', archived: false },
  { id: 28, parentId: 27, kind: 'EXPENSE', name: '话费', icon: 'Phone', archived: false },
  { id: 29, parentId: 27, kind: 'EXPENSE', name: '燃气费', icon: 'Flame', archived: false },
  { id: 30, parentId: 27, kind: 'EXPENSE', name: '水费', icon: 'Droplets', archived: false },
  { id: 31, parentId: 27, kind: 'EXPENSE', name: '电费', icon: 'Zap', archived: false },

  { id: 32, parentId: null, kind: 'EXPENSE', name: '其他支出', icon: 'Ellipsis', archived: false },

  { id: 33, parentId: null, kind: 'INCOME', name: '工资', icon: 'CircleDollarSign', archived: false },
  { id: 34, parentId: null, kind: 'INCOME', name: '奖金', icon: 'HandCoins', archived: false },
  { id: 35, parentId: null, kind: 'INCOME', name: '理财', icon: 'TrendingUp', archived: false },
  { id: 36, parentId: null, kind: 'INCOME', name: '红包', icon: 'Gift', archived: false },
  { id: 37, parentId: null, kind: 'INCOME', name: '其他收入', icon: 'Wallet', archived: false },
]

export const seedTags: Tag[] = [
  { id: 1, name: '必要', icon: 'BadgeCheck' },
  { id: 2, name: '可省', icon: 'Leaf' },
  { id: 3, name: '出差', icon: 'Briefcase' },
  { id: 4, name: '家庭', icon: 'Home' },
  { id: 5, name: '订阅', icon: 'Sparkles' },
]

export const seedSettings: SysSettingItem[] = [
  { id: 1, name: 'base_currency', value: 'CNY' },
  { id: 2, name: 'timezone', value: 'Asia/Shanghai' },
  { id: 3, name: 'week_start', value: '1' },
]

/** 初始不灌示例流水，账本从空白开始 */
export const seedTransactions: Transaction[] = []
