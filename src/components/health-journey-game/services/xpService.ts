export const XP_TABLE = {
 drink_water:10,
 walk:50,
 deep_work:60,
 read_book:30,
 breathing:20,
 no_sugar:40,
 cold_shower:20,
 reflection:20,
 inbody:100
};

export function calculateXP(type:string){
 return XP_TABLE[type as keyof typeof XP_TABLE] || 0;
}