export interface User {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  created_at: string;
}

export interface DailyPlan {
  id: number;
  user_id: number;
  date: string;
  created_at: string;
}

export interface Task {
  id: number;
  plan_id: number;
  title: string;
  completed: boolean;
  order_index: number;
  created_at: string;
}

export interface Streak {
  id: number;
  user_id: number;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
}

export interface DayPlanWithTasks {
  plan: DailyPlan | null;
  tasks: Task[];
  streak: number;
}

export interface WeekDaySummary {
  date: string;
  total: number;
  completed: number;
  hasPlan: boolean;
}

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}
