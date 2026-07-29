import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "전체 글", end: true },
  { to: "/my-posts", label: "내 글", end: false },
  { to: "/posts/new", label: "글쓰기", end: false },
];

/** 좌측 네비 — DESIGN.md 시안 C의 pill 활성 상태(radius-full, 크림 배경 + 액센트 글자). */
export function SideNav() {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `rounded-full px-3.5 py-2 text-sm transition ${
              isActive
                ? "bg-[#fbe8d3] font-bold text-accent"
                : "text-ink/60 hover:bg-[#fbe8d3]/50"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
