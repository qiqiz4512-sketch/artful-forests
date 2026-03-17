const randomIn = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const USER_NUDGE_BUBBLE_MS = 3200;
export const USER_NUDGE_FOLLOWUP_CHANCE = 0.38;
export const USER_NUDGE_FOLLOWUP_DELAY_MS = 900;

const USER_NUDGE_LINES_COMMON = [
  '有事吗？',
  '找我干嘛？',
  '先说重点，我叶子要掉了。',
  '你先夸我两句我再听。',
  '又来催更树生故事了？',
  '我在营业，你在偷看。',
];

const USER_NUDGE_LINES_BY_PERSONALITY: Record<string, string[]> = {
  社恐: ['可、可以打字吗…', '我先紧张一下再回答你。'],
  活泼: ['你点我我就当你在打 call！', '来都来了，聊两句呀！'],
  顽皮: ['点我一下，今天好运+1。', '你是不是偷偷最喜欢我？'],
  睿智: ['问题很好，先深呼吸。', '答案在风里，你再问一次。'],
  温柔: ['慢慢说，我在听。', '别急，我会认真回你。'],
  神启: ['凡人，你成功召唤了我。', '请讲，我已开启神谕频道。'],
};

const USER_NUDGE_FOLLOWUP_LINES = [
  '所以呢？',
  '然后？继续说。',
  '重点呢？我在等。',
  '这就是全部情报？',
  '行，我姑且听着。',
];

const TREE_SHAKE_REPLY_COMMON = [
  '别摇啦，我在思考呢！',
  '先别晃，我脑内年轮还在转。',
];

const TREE_SHAKE_REPLY_BY_PERSONALITY: Record<string, string[]> = {
  社恐: ['别、别摇啦，我在思考呢…', '等一下，我还在小声组织语言。'],
  活泼: ['别摇啦，我在思考呢！马上就接上！', '欸欸欸别连点，我脑瓜已经在加速啦！'],
  顽皮: ['别摇啦，我在思考呢，你差点把我灵感晃掉。', '再摇我就把答案藏进树洞里了。'],
  睿智: ['别摇啦，我在思考呢，答案需要一点发酵时间。', '别急，枝叶还在整理结论。'],
  温柔: ['别摇啦，我在思考呢，我会认真回你的。', '再给我一点点时间，我正在把话想完整。'],
  神启: ['别摇啦，我在思考呢，神谕加载中。', '凡人稍安，启示正在穿过枝叶。'],
};

export const pickUserNudgeLine = (personality?: string, isManual?: boolean) => {
  if (isManual) return randomIn(USER_NUDGE_LINES_BY_PERSONALITY['神启']);
  const specific = personality ? USER_NUDGE_LINES_BY_PERSONALITY[personality] ?? [] : [];
  return randomIn([...specific, ...USER_NUDGE_LINES_COMMON]);
};

export const pickUserNudgeFollowup = () => randomIn(USER_NUDGE_FOLLOWUP_LINES);

export const pickTreeShakeReply = (personality?: string, isManual?: boolean) => {
  if (isManual) return randomIn(TREE_SHAKE_REPLY_BY_PERSONALITY['神启']);
  const specific = personality ? TREE_SHAKE_REPLY_BY_PERSONALITY[personality] ?? [] : [];
  return randomIn(specific.length > 0 ? specific : TREE_SHAKE_REPLY_COMMON);
};

export const getTreeShakeMotion = (personality?: string, isManual?: boolean) => {
  if (isManual) {
    return {
      x: [0, -5.2, 5.2, -4.1, 4.1, 0],
      rotate: [0, -2.1, 2.1, -1.4, 1.4, 0],
      scale: [1, 1.016, 1],
      durationMs: 460,
    };
  }

  switch (personality) {
    case '社恐':
      return {
        x: [0, -2.1, 2.1, -1.2, 1.2, 0],
        rotate: [0, -0.8, 0.8, -0.45, 0.45, 0],
        scale: [1, 1.006, 1],
        durationMs: 360,
      };
    case '温柔':
      return {
        x: [0, -3.2, 3.2, -2.1, 2.1, 0],
        rotate: [0, -1.2, 1.2, -0.72, 0.72, 0],
        scale: [1, 1.009, 1],
        durationMs: 390,
      };
    case '睿智':
      return {
        x: [0, -2.8, 2.8, -1.8, 1.8, 0],
        rotate: [0, -1.05, 1.05, -0.62, 0.62, 0],
        scale: [1, 1.008, 1],
        durationMs: 410,
      };
    case '活泼':
      return {
        x: [0, -5.6, 5.6, -4.2, 4.2, 0],
        rotate: [0, -2.3, 2.3, -1.5, 1.5, 0],
        scale: [1, 1.018, 1],
        durationMs: 430,
      };
    case '顽皮':
      return {
        x: [0, -4.9, 4.9, -3.8, 3.8, 0],
        rotate: [0, -2, 2, -1.3, 1.3, 0],
        scale: [1, 1.014, 1],
        durationMs: 420,
      };
    default:
      return {
        x: [0, -4.1, 4.1, -2.9, 2.9, 0],
        rotate: [0, -1.6, 1.6, -1, 1, 0],
        scale: [1, 1.01, 1],
        durationMs: 420,
      };
  }
};

export const getSceneReplyBubbleDuration = (input: {
  personality?: string;
  isManual?: boolean;
  source?: 'auto' | 'user' | 'llm';
  type?: 'chat' | 'epic' | 'system';
  message?: string;
}) => {
  const messageLength = Array.from(input.message?.trim() ?? '').length;
  const lengthBonus = Math.min(1200, Math.max(0, messageLength - 8) * 55);

  if (input.type === 'epic') return Math.min(9000, 8200 + lengthBonus);
  if (input.isManual) {
    const base = input.source === 'llm' ? 7600 : 7000;
    return Math.min(8600, base + lengthBonus);
  }

  const sourceBonus = input.source === 'llm' ? 500 : 0;
  let baseDuration = 6400 + sourceBonus;

  switch (input.personality) {
    case '社恐':
      baseDuration = 5200 + sourceBonus;
      break;
    case '活泼':
      baseDuration = 6600 + sourceBonus;
      break;
    case '顽皮':
      baseDuration = 6400 + sourceBonus;
      break;
    case '睿智':
      baseDuration = 6800 + sourceBonus;
      break;
    case '温柔':
      baseDuration = 6200 + sourceBonus;
      break;
    case '神启':
      baseDuration = 7400 + sourceBonus;
      break;
    default:
      baseDuration = 6400 + sourceBonus;
      break;
  }

  return Math.min(8200, Math.max(4800, baseDuration + lengthBonus));
};

export const getSceneReplyBubbleLayout = (input: {
  durationMs: number;
  message?: string;
}) => {
  const messageLength = Array.from(input.message?.trim() ?? '').length;

  if (input.durationMs >= 7600 || messageLength >= 54) {
    return {
      lineClamp: 3,
      maxWidth: 236,
      previewChars: 72,
    };
  }

  if (input.durationMs <= 5600 || messageLength <= 18) {
    return {
      lineClamp: 2,
      maxWidth: 196,
      previewChars: 38,
    };
  }

  return {
    lineClamp: 2,
    maxWidth: 220,
    previewChars: 52,
  };
};

export const getSceneReplyBubbleMotion = (input: {
  personality?: string;
  isManual?: boolean;
}) => {
  if (input.isManual) {
    return {
      opacity: [0.2, 0.82, 1, 0.97],
      y: [6, -3, 0],
      scale: [0.95, 1.03, 1],
      opacityDuration: 0.62,
      opacityTimes: [0, 0.38, 0.72, 1],
      scaleDuration: 0.42,
    };
  }

  switch (input.personality) {
    case '社恐':
      return {
        opacity: [0.35, 0.92, 1],
        y: [4, -1, 0],
        scale: [0.985, 1.008, 1],
        opacityDuration: 0.42,
        opacityTimes: [0, 0.58, 1],
        scaleDuration: 0.26,
      };
    case '温柔':
      return {
        opacity: [0.24, 0.88, 1, 0.98],
        y: [5, -2, 0],
        scale: [0.97, 1.015, 1],
        opacityDuration: 0.56,
        opacityTimes: [0, 0.42, 0.76, 1],
        scaleDuration: 0.34,
      };
    case '睿智':
      return {
        opacity: [0.18, 0.78, 1],
        y: [7, -1.5, 0],
        scale: [0.96, 1.01, 1],
        opacityDuration: 0.68,
        opacityTimes: [0, 0.62, 1],
        scaleDuration: 0.38,
      };
    case '活泼':
      return {
        opacity: [0.22, 0.9, 1, 0.96],
        y: [8, -4, 0],
        scale: [0.94, 1.04, 1],
        opacityDuration: 0.48,
        opacityTimes: [0, 0.32, 0.68, 1],
        scaleDuration: 0.36,
      };
    case '顽皮':
      return {
        opacity: [0.22, 0.86, 1, 0.97],
        y: [7, -3.2, 0],
        scale: [0.95, 1.03, 1],
        opacityDuration: 0.46,
        opacityTimes: [0, 0.34, 0.7, 1],
        scaleDuration: 0.34,
      };
    case '神启':
      return {
        opacity: [0.16, 0.74, 1, 0.98],
        y: [9, -2.5, 0],
        scale: [0.93, 1.035, 1],
        opacityDuration: 0.72,
        opacityTimes: [0, 0.46, 0.78, 1],
        scaleDuration: 0.44,
      };
    default:
      return {
        opacity: [0.24, 0.92, 1, 0.96],
        y: [4, -2, 0],
        scale: [0.97, 1.018, 1],
        opacityDuration: 0.56,
        opacityTimes: [0, 0.42, 0.72, 1],
        scaleDuration: 0.38,
      };
  }
};

export const getSceneReplyBubblePalette = (input: {
  personality?: string;
  isManual?: boolean;
}) => {
  if (input.isManual) {
    return {
      background: 'linear-gradient(160deg, rgba(255, 250, 234, 0.44), rgba(255, 232, 188, 0.28))',
      border: '1px solid rgba(255, 231, 170, 0.34)',
      boxShadow: '0 14px 30px rgba(108, 88, 44, 0.16), inset 0 1px 0 rgba(255, 250, 228, 0.38), inset 0 -1px 0 rgba(255, 236, 195, 0.14)',
      textColor: '#4A3922',
      tailBackground: 'linear-gradient(160deg, rgba(255, 250, 234, 0.44), rgba(255, 232, 188, 0.28))',
      tailBorder: 'rgba(255, 231, 170, 0.34)',
    };
  }

  switch (input.personality) {
    case '社恐':
      return {
        background: 'linear-gradient(160deg, rgba(244, 246, 249, 0.42), rgba(217, 224, 232, 0.24))',
        border: '1px solid rgba(222, 230, 240, 0.3)',
        boxShadow: '0 14px 28px rgba(79, 92, 112, 0.1), inset 0 1px 0 rgba(252, 253, 255, 0.34), inset 0 -1px 0 rgba(232, 238, 245, 0.12)',
        textColor: '#38424D',
        tailBackground: 'linear-gradient(160deg, rgba(244, 246, 249, 0.42), rgba(217, 224, 232, 0.24))',
        tailBorder: 'rgba(222, 230, 240, 0.3)',
      };
    case '温柔':
      return {
        background: 'linear-gradient(160deg, rgba(255, 243, 246, 0.44), rgba(250, 221, 229, 0.26))',
        border: '1px solid rgba(255, 226, 234, 0.32)',
        boxShadow: '0 14px 28px rgba(150, 96, 115, 0.11), inset 0 1px 0 rgba(255, 248, 250, 0.36), inset 0 -1px 0 rgba(255, 230, 236, 0.12)',
        textColor: '#533841',
        tailBackground: 'linear-gradient(160deg, rgba(255, 243, 246, 0.44), rgba(250, 221, 229, 0.26))',
        tailBorder: 'rgba(255, 226, 234, 0.32)',
      };
    case '睿智':
      return {
        background: 'linear-gradient(160deg, rgba(238, 247, 252, 0.44), rgba(203, 230, 243, 0.25))',
        border: '1px solid rgba(212, 237, 247, 0.32)',
        boxShadow: '0 14px 28px rgba(72, 113, 142, 0.12), inset 0 1px 0 rgba(245, 251, 255, 0.36), inset 0 -1px 0 rgba(222, 241, 250, 0.12)',
        textColor: '#25465A',
        tailBackground: 'linear-gradient(160deg, rgba(238, 247, 252, 0.44), rgba(203, 230, 243, 0.25))',
        tailBorder: 'rgba(212, 237, 247, 0.32)',
      };
    case '活泼':
      return {
        background: 'linear-gradient(160deg, rgba(255, 248, 230, 0.44), rgba(255, 225, 166, 0.27))',
        border: '1px solid rgba(255, 232, 182, 0.34)',
        boxShadow: '0 14px 28px rgba(160, 124, 48, 0.13), inset 0 1px 0 rgba(255, 251, 238, 0.38), inset 0 -1px 0 rgba(255, 235, 196, 0.12)',
        textColor: '#5B431E',
        tailBackground: 'linear-gradient(160deg, rgba(255, 248, 230, 0.44), rgba(255, 225, 166, 0.27))',
        tailBorder: 'rgba(255, 232, 182, 0.34)',
      };
    case '顽皮':
      return {
        background: 'linear-gradient(160deg, rgba(255, 241, 230, 0.44), rgba(255, 210, 184, 0.26))',
        border: '1px solid rgba(255, 223, 208, 0.32)',
        boxShadow: '0 14px 28px rgba(160, 92, 55, 0.12), inset 0 1px 0 rgba(255, 248, 242, 0.36), inset 0 -1px 0 rgba(255, 229, 214, 0.12)',
        textColor: '#5A3428',
        tailBackground: 'linear-gradient(160deg, rgba(255, 241, 230, 0.44), rgba(255, 210, 184, 0.26))',
        tailBorder: 'rgba(255, 223, 208, 0.32)',
      };
    case '神启':
      return {
        background: 'linear-gradient(160deg, rgba(245, 239, 255, 0.44), rgba(222, 205, 255, 0.26))',
        border: '1px solid rgba(231, 223, 255, 0.34)',
        boxShadow: '0 14px 30px rgba(104, 82, 156, 0.16), inset 0 1px 0 rgba(250, 247, 255, 0.38), inset 0 -1px 0 rgba(233, 224, 255, 0.12)',
        textColor: '#40345E',
        tailBackground: 'linear-gradient(160deg, rgba(245, 239, 255, 0.44), rgba(222, 205, 255, 0.26))',
        tailBorder: 'rgba(231, 223, 255, 0.34)',
      };
    default:
      return {
        background: 'linear-gradient(160deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.28))',
        border: '1px solid rgba(255, 255, 255, 0.24)',
        boxShadow: '0 14px 28px rgba(88, 98, 112, 0.11), inset 0 1px 0 rgba(255, 255, 255, 0.34), inset 0 -1px 0 rgba(255, 255, 255, 0.12)',
        textColor: '#2D4030',
        tailBackground: 'linear-gradient(160deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.28))',
        tailBorder: 'rgba(255, 255, 255, 0.24)',
      };
  }
};