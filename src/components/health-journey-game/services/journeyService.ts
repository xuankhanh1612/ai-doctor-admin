export class JourneyService {

  static updateProgress(activityType:string){
    const progress = JSON.parse(localStorage.getItem('journey_progress') || '{}');

    progress[activityType] = (progress[activityType] || 0) + 1;

    localStorage.setItem(
      'journey_progress',
      JSON.stringify(progress)
    );

    return progress;
  }

  static unlockChapter(progress:any){
    if((progress.drink_water||0)>=30 &&
       (progress.walk||0)>=20 &&
       (progress.deep_work||0)>=10){
        return 2;
    }
    return 1;
  }
}