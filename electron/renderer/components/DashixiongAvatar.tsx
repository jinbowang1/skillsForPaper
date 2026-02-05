import React from "react";
import avatarUrl from "../assets/avatar.png";

interface Props {
  size?: number;
}

/**
 * 大师兄头像 — 戴眼镜的橘猫
 */
export default function DashixiongAvatar({ size = 28 }: Props) {
  return (
    <img
      src={avatarUrl}
      alt="大师兄"
      width={size}
      height={size}
      style={{ borderRadius: "50%", flexShrink: 0, objectFit: "cover" }}
    />
  );
}
