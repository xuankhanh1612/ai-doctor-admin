export class RewardService {

  static grantCoins(amount:number){
    const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
    profile.coins = (profile.coins || 0) + amount;
    localStorage.setItem('user_profile', JSON.stringify(profile));
    return profile.coins;
  }

  static grantXP(amount:number){
    const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
    profile.xp = (profile.xp || 0) + amount;
    localStorage.setItem('user_profile', JSON.stringify(profile));
    return profile.xp;
  }

  static chapterReward(chapter:number){
    return {
      chapter,
      reward:'Epic Chest',
      coins:500
    };
  }
}