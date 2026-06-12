export class ProofService {
 static verify(image:string){
   return {
     image,
     verified:true,
     confidence:0.95,
     verifiedAt:new Date().toISOString()
   }
 }
}