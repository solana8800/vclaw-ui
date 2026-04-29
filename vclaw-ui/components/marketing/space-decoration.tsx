"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function SpaceDecoration() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Kiểm tra theme hiện tại
    const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkDark();

    // Theo dõi khi theme thay đổi
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  if (!mounted) return null;

  return (
    // Đặt z-0 để nằm trên background nhưng dưới content
    <div className="pointer-events-none absolute inset-0 z-[1]">
      {/* Galaxy Starfield - chỉ hiển thị dark mode */}
      {isDark && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: [
              // Lớp sao nhỏ
              "radial-gradient(1px 1px at 10% 8%, rgba(255,255,255,0.9) 100%, transparent)",
              "radial-gradient(1px 1px at 23% 17%, rgba(255,255,255,0.7) 100%, transparent)",
              "radial-gradient(1.5px 1.5px at 38% 5%, rgba(255,255,255,0.8) 100%, transparent)",
              "radial-gradient(1px 1px at 55% 30%, rgba(255,255,255,0.6) 100%, transparent)",
              "radial-gradient(2px 2px at 70% 12%, rgba(255,255,255,0.9) 100%, transparent)",
              "radial-gradient(1px 1px at 88% 22%, rgba(255,255,255,0.5) 100%, transparent)",
              "radial-gradient(1.5px 1.5px at 6% 45%, rgba(255,255,255,0.7) 100%, transparent)",
              "radial-gradient(1px 1px at 42% 58%, rgba(255,255,255,0.6) 100%, transparent)",
              "radial-gradient(1px 1px at 78% 65%, rgba(255,255,255,0.8) 100%, transparent)",
              "radial-gradient(2px 2px at 15% 78%, rgba(255,255,255,0.7) 100%, transparent)",
              "radial-gradient(1px 1px at 62% 86%, rgba(255,255,255,0.5) 100%, transparent)",
              "radial-gradient(1.5px 1.5px at 93% 72%, rgba(255,255,255,0.9) 100%, transparent)",
              "radial-gradient(1px 1px at 31% 93%, rgba(255,255,255,0.6) 100%, transparent)",
              "radial-gradient(1px 1px at 82% 45%, rgba(255,255,255,0.7) 100%, transparent)",
              // Sao màu có tông brand
              "radial-gradient(2px 2px at 47% 20%, rgba(209,50,56,0.6) 100%, transparent)",
              "radial-gradient(1.5px 1.5px at 90% 10%, rgba(255,242,0,0.5) 100%, transparent)",
              "radial-gradient(2px 2px at 5% 90%, rgba(143,87,199,0.5) 100%, transparent)",
            ].join(", "),
            backgroundSize: "100% 100%",
            opacity: 0.6,
          }}
        />
      )}

      {/* Artemis 2 - mobile: dưới cùng căn giữa | desktop: góc phải trên */}

      {/* Phiên bản mobile: nhỏ hơn, dưới cùng, căn giữa */}
      <div
        className="animate-vclaw-float-slow absolute bottom-[30%] left-1/2 -translate-x-1/2 block lg:hidden z-[2]"
        style={{
          filter: isDark
            ? "drop-shadow(0 0 20px rgba(209,50,56,0.4)) drop-shadow(0 0 40px rgba(209,50,56,0.15))"
            : "drop-shadow(0 0 8px rgba(209,50,56,0.15))",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 120,
            height: 175,
            opacity: isDark ? 0.75 : 0.45,
            transition: "opacity 0.5s ease",
          }}
        >
          <Image
            src="/artemis2.png"
            alt="Artemis 2"
            fill
            sizes="120px"
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Phiên bản desktop: to hơn, góc phải */}
      <div
        className="animate-vclaw-float-slow absolute right-[6%] top-[-6%] hidden lg:block z-[2]"
        style={{
          filter: isDark
            ? "drop-shadow(0 0 30px rgba(209,50,56,0.5)) drop-shadow(0 0 60px rgba(209,50,56,0.2))"
            : "drop-shadow(0 0 12px rgba(209,50,56,0.2))",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 220,
            height: 320,
            opacity: isDark ? 1.0 : 0.8,
            transition: "opacity 0.5s ease",
          }}
        >
          <Image
            src="/artemis2.png"
            alt="Artemis 2"
            fill
            sizes="220px"
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}
