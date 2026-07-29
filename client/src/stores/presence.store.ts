import { create } from "zustand";

export type SocketStatus = "connected" | "connecting" | "disconnected";

interface PresenceState {
  /** 소켓 연결 상태 — `ConnectionBadge`가 그대로 렌더링한다(눈속임 없이 실제 상태). */
  status: SocketStatus;
  /** `presence:sync`가 보내는 "내 계정의 활성 소켓 수"(다중 탭 데모용, SC-4). */
  connections: number;
  setStatus: (status: SocketStatus) => void;
  setConnections: (connections: number) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  status: "disconnected",
  connections: 0,
  setStatus: (status) => set({ status }),
  setConnections: (connections) => set({ connections }),
}));
