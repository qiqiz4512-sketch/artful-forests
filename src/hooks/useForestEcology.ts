import { useEffect, useMemo, useRef, useState } from 'react';
import { SocialState } from '@/types/forest';
import { useForestStore } from '@/stores/useForestStore';
import { getWorldEcologySocialMood, inferWorldWidthFromPositions } from '@/lib/worldEcology';

const TRANSITION_MS = 3000;

export function useForestEcology() {
  const agents = useForestStore((state) => state.agents);
  const talkingAgents = useMemo(
    () => agents.filter((agent) => agent.socialState === SocialState.TALKING),
    [agents],
  );
  const talkingRatio = useMemo(() => {
    if (agents.length === 0) return 0;
    return talkingAgents.length / agents.length;
  }, [agents, talkingAgents]);
  const worldWidth = useMemo(
    () => inferWorldWidthFromPositions(agents.map((agent) => agent.position.x)),
    [agents],
  );
  const ecologyActivity = useMemo(() => {
    if (talkingAgents.length === 0) {
      return { emissionBoost: 1, fluteFrequency: 880 };
    }

    const total = talkingAgents.reduce(
      (acc, agent) => {
        const mood = getWorldEcologySocialMood(agent.position.x, worldWidth);
        acc.emission += mood.emissionBoost;
        acc.frequency += mood.fluteFrequency;
        return acc;
      },
      { emission: 0, frequency: 0 },
    );

    return {
      emissionBoost: total.emission / talkingAgents.length,
      fluteFrequency: total.frequency / talkingAgents.length,
    };
  }, [talkingAgents, worldWidth]);

  const [emissionRateMultiplier, setEmissionRateMultiplier] = useState(1);
  const audioContextRef = useRef<AudioContext | null>(null);
  const fluteOscRef = useRef<OscillatorNode | null>(null);
  const fluteGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const target = talkingRatio > 0.3 ? 1.6 * ecologyActivity.emissionBoost : ecologyActivity.emissionBoost;
    const start = performance.now();
    const from = emissionRateMultiplier;
    let raf = 0;

    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / TRANSITION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setEmissionRateMultiplier(from + (target - from) * eased);
      if (t < 1) raf = window.requestAnimationFrame(animate);
    };

    raf = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(raf);
  }, [ecologyActivity.emissionBoost, talkingRatio]);

  useEffect(() => {
    const shouldEnhance = talkingRatio > 0.3;

    const ensureAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      return audioContextRef.current;
    };

    if (shouldEnhance) {
      const audioContext = ensureAudioContext();
      void audioContext.resume();

      if (!fluteOscRef.current || !fluteGainRef.current) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = 'triangle';
        osc.frequency.value = ecologyActivity.fluteFrequency;
        gain.gain.value = 0;

        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start();

        fluteOscRef.current = osc;
        fluteGainRef.current = gain;
      }

      const gain = fluteGainRef.current;
      const osc = fluteOscRef.current;
      if (osc) {
        osc.frequency.cancelScheduledValues(audioContext.currentTime);
        osc.frequency.setValueAtTime(osc.frequency.value, audioContext.currentTime);
        osc.frequency.linearRampToValueAtTime(ecologyActivity.fluteFrequency, audioContext.currentTime + 1.4);
      }
      if (gain) {
        gain.gain.cancelScheduledValues(audioContext.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.045, audioContext.currentTime + TRANSITION_MS / 1000);
      }
      return;
    }

    const audioContext = audioContextRef.current;
    const gain = fluteGainRef.current;
    const osc = fluteOscRef.current;
    if (!audioContext || !gain || !osc) return;

    gain.gain.cancelScheduledValues(audioContext.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.0001, audioContext.currentTime + TRANSITION_MS / 1000);

    const stopAt = audioContext.currentTime + TRANSITION_MS / 1000 + 0.05;
    osc.stop(stopAt);
    window.setTimeout(() => {
      fluteOscRef.current = null;
      fluteGainRef.current = null;
    }, TRANSITION_MS + 120);
  }, [ecologyActivity.fluteFrequency, talkingRatio]);

  return {
    talkingRatio,
    emissionRateMultiplier,
  };
}
