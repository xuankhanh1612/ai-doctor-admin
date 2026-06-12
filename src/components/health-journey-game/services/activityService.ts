export interface Activity {
  id:string;
  userId:string;
  type:string;
  timestamp:string;
  value?:number;
  proofImage?:string;
  xpEarned:number;
}

export class ActivityService {
  static create(activity: Activity) {
    const activities = JSON.parse(localStorage.getItem('journey_activities') || '[]');
    activities.push(activity);
    localStorage.setItem('journey_activities', JSON.stringify(activities));
    return activity;
  }

  static getByUser(userId:string){
    return JSON.parse(localStorage.getItem('journey_activities') || '[]')
      .filter((a:any)=>a.userId===userId);
  }
}