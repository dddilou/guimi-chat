// Resolve from the complete saved conversation, not the model's shortened context.
export function replyMode(messages) {
  let mode='auto';
  for(const message of messages){
    if(message.role!=='user'||message.sticker)continue;
    const text=message.content.replace(/[“「『][\s\S]*?[”」』]|"[^"\n]*"/g,'');
    for(let clause of text.split(/[，,。！!？?；;\n]|而是/)){
      clause=clause.trim();
      if(!clause||/^(如果|假如|比如|例如|他说|她说|我朋友|之前|以前)/.test(clause))continue;
      if(/^(?:那|你|请|我们|现在|以后|接下来|还是|就|可以|都|从现在开始|给我|我想让你)*\s*(?:恢复(?:正常|自动|默认)(?:聊天|回复|模式)?|自由(?:选择|发挥)|随意(?:回复)?|文字(?:和|跟|与)语音(?:混合|穿插)|语音(?:和|跟|与)文字(?:混合|穿插)|想发什么就发什么)/.test(clause)){mode='auto';continue;}
      clause=clause.replace(/\s+/g,'');
      const match=clause.match(/^(?:(?:从现在(?:开始|起)|以后|接下来|今后|一直|始终|全都|全部|每次|都|只|就|请|麻烦|还是|改成|改为|切换成|切换为|我想让你|我希望你|我想要|我想|你|给我|跟我|和我|继续|必须|要|能不能))*((?:不要|不许|不准|别|停止)(?:再|继续)?)?(?:发(?:送)?|用|使用|回复)?(语音|文字|文本|打字)(?:回复|聊天|说话|回答|交流|了|吧|呀|啊|哦|好吗|好不好|给我|跟我|和我|我|就行|就好|就可以|可以吗|行吗)*$/);
      if(match){const target=match[2]==='语音'?'voice':'text';mode=match[1]?(target==='voice'?'text':'voice'):target;}
    }
  }
  return mode;
}

export function speechInstructions(mode,enabled,count){
  if(!enabled)return '\n当前网站未配置语音合成，只能发送文字和表情，不承诺已发送语音。';
  const capability='\n网站已接入派派音色的真实语音合成，后台负责生成可播放的语音气泡。你只输出要说的原话和表情标记，不写“这句是语音”“语音消息”等舞台说明，不声称自己不能发语音。旧对话里关于不能发语音的说法已过时。';
  if(mode==='text')return capability+'\n用户明确选择持续文字回复，直到用户更改要求；本轮所有话都以文字发送，可以照常搭配表情。';
  if(mode==='voice')return capability+'\n用户明确选择持续语音回复，直到用户更改要求；本轮所有话都将合成为真实语音。每段最多100字，共1～3条，可以配一张合适表情。不要用文字假装语音或宣称只能打字。';
  return capability+(count?'\n本轮自动穿插语音，每段最多100字，用空行分段。可以自然分享角色自己的兴趣、看法或虚构小日常。语音仍配合适的表情，总共1～3条。':'\n本轮以文字和合适的表情自然回复，之后后台会自动穿插语音。');
}
