
import { create } from 'zustand';

export const useJourneyStore = create((set,get)=>({
  xp:0, coins:0, energy:100,
  currentChapter:1, chapterProgress:0,
  streak:0, achievements:[],
  dailyTasks:[],
  inventory:[],
  addXP:(amount)=>set((s)=>({xp:s.xp+amount})),
  claimReward:(coins)=>set((s)=>({coins:s.coins+coins})),
  unlockAchievement:(a)=>set((s)=>({achievements:[...s.achievements,a]})),
  completeTask:(taskId)=>{},
  syncSupabase: async()=>{}
}));
