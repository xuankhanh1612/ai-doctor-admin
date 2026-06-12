
export function updateStreak(lastCompletedDate,currentStreak,today){
  const diff=Math.floor((today-lastCompletedDate)/(1000*60*60*24));
  if(diff===1) return currentStreak+1;
  if(diff>1) return 1;
  return currentStreak;
}
