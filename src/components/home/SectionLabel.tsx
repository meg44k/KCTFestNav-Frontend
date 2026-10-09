import { u } from "@/lib/home/design-unit";

/** 入口ページの部品の外側の左上に付ける小さい見出し(「いまのステージ」「さがす」) */
export function SectionLabel({
  children,
  id,
}: {
  children: string;
  id?: string;
}) {
  return (
    <h2
      id={id}
      className="font-bold text-white/70"
      style={{
        fontSize: u(10),
        lineHeight: 1,
        marginBottom: u(6),
        paddingLeft: u(2),
      }}
    >
      {children}
    </h2>
  );
}
