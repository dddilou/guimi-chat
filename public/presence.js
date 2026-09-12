export function canInitiate({now,lastInteraction,presence,lastUser,lastRole,available}){
  const userToken=lastUser?.id||'first-visit';
  if(!available||presence.enabled===false||now-lastInteraction<10000)return false;
  if(presence.userToken===userToken||now-(presence.lastAt||0)<10000||lastRole==='user')return false;
  if(lastUser&&/晚安|睡了|睡觉|先不聊|别发|别烦|安静|写作业|有作业|在忙/.test(lastUser.content))return false;
  return true;
}
