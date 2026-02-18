import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import type { AppRole } from "@/lib/auth/roles";
import { AuthGate } from "@/components/auth/AuthGate";

type NavItem = {
  label: string;
  href: string;
  allowed: AppRole[];
};

const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", allowed: ["engineer", "pit", "coach"] },
  { label: "Pit", href: "/dashboard/pit", allowed: ["engineer", "pit"] },
  { label: "Coach", href: "/dashboard/coach", allowed: ["engineer", "coach"] },
  { label: "Engineer", href: "/dashboard/engineer", allowed: ["engineer"] }
];

export default async function DashboardPage() {
  const { email, role } = await requireRole(["engineer", "pit", "coach"]);

  return (
    <AuthGate>
      <div className="bg-background-light dark:bg-background-dark text-white min-h-screen flex flex-col overflow-auto">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-dark bg-surface-dark px-6 py-3 shrink-0">
        <div className="flex items-center gap-4 text-white">
          <div className="size-6 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z"
                fill="currentColor"
              ></path>
              <path
                clipRule="evenodd"
                d="M39.998 35.764C39.9944 35.7463 39.9875 35.7155 39.9748 35.6706C39.9436 35.5601 39.8949 35.4259 39.8346 35.2825C39.8168 35.2403 39.7989 35.1993 39.7813 35.1602C38.5103 34.2887 35.9788 33.0607 33.7095 32.5189C30.9875 31.8691 27.6413 31.4783 24 31.4783C20.3587 31.4783 17.0125 31.8691 14.2905 32.5189C12.0012 33.0654 9.44505 34.3104 8.18538 35.1832C8.17384 35.2075 8.16216 35.233 8.15052 35.2592C8.09919 35.3751 8.05721 35.4886 8.02977 35.589C8.00356 35.6848 8.00039 35.7333 8.00004 35.7388C8.00004 35.739 8 35.7393 8.00004 35.7388C8.00004 35.7641 8.0104 36.0767 8.68485 36.6314C9.34546 37.1746 10.4222 37.7531 11.9291 38.2772C14.9242 39.319 19.1919 40 24 40C28.8081 40 33.0758 39.319 36.0709 38.2772C37.5778 37.7531 38.6545 37.1746 39.3151 36.6314C39.9006 36.1499 39.9857 35.8511 39.998 35.764ZM4.95178 32.7688L21.4543 6.30267C22.6288 4.4191 25.3712 4.41909 26.5457 6.30267L43.0534 32.777C43.0709 32.8052 43.0878 32.8338 43.104 32.8629L41.3563 33.8352C43.104 32.8629 43.1038 32.8626 43.104 32.8629L43.1051 32.865L43.1065 32.8675L43.1101 32.8739L43.1199 32.8918C43.1276 32.906 43.1377 32.9246 43.1497 32.9473C43.1738 32.9925 43.2062 33.0545 43.244 33.1299C43.319 33.2792 43.4196 33.489 43.5217 33.7317C43.6901 34.1321 44 34.9311 44 35.7391C44 37.4427 43.003 38.7775 41.8558 39.7209C40.6947 40.6757 39.1354 41.4464 37.385 42.0552C33.8654 43.2794 29.133 44 24 44C18.867 44 14.1346 43.2794 10.615 42.0552C8.86463 41.4464 7.30529 40.6757 6.14419 39.7209C4.99695 38.7775 3.99999 37.4427 3.99999 35.7391C3.99999 34.8725 4.29264 34.0922 4.49321 33.6393C4.60375 33.3898 4.71348 33.1804 4.79687 33.0311C4.83898 32.9556 4.87547 32.8935 4.9035 32.8471C4.91754 32.8238 4.92954 32.8043 4.93916 32.7889L4.94662 32.777L4.95178 32.7688ZM35.9868 29.004L24 9.77997L12.0131 29.004C12.4661 28.8609 12.9179 28.7342 13.3617 28.6282C16.4281 27.8961 20.0901 27.4783 24 27.4783C27.9099 27.4783 31.5719 27.8961 34.6383 28.6282C35.082 28.7342 35.5339 28.8609 35.9868 29.004Z"
                fill="currentColor"
                fillRule="evenodd"
              ></path>
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold leading-tight tracking-tight uppercase">
            Apatte Command Center
            <span className="text-primary/60 ml-2 font-normal text-sm">
              Shell Eco-Marathon 2027
            </span>
          </h2>
          <nav id="topNav" className="flex gap-6 ml-8 border-l border-border-dark pl-6">
            {navItems.map(item => {
              const isAllowed = item.allowed.includes(role);
              const isActive = item.href === "/dashboard";

              if (!isAllowed) {
                return (
                  <span
                    key={item.label}
                    title="Unauthorized"
                    className="text-sm font-medium text-white/30 cursor-not-allowed"
                  >
                    {item.label}
                  </span>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
                    isActive
                      ? "text-sm font-bold text-primary"
                      : "text-sm font-medium text-white/60 hover:text-white transition-colors"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-8 border-r border-border-dark pr-6">
            <div className="flex flex-col w-48">
              <div className="flex justify-between text-[10px] font-bold uppercase text-accent-hydrogen mb-1">
                <span>PH-H2 Hydrogen</span>
                <span>Lap 13/20</span>
              </div>
              <div className="h-1.5 w-full bg-border-dark rounded-full overflow-hidden">
                <div className="h-full bg-accent-hydrogen w-[65%]"></div>
              </div>
            </div>
            <div className="flex flex-col w-48">
              <div className="flex justify-between text-[10px] font-bold uppercase text-accent-electric mb-1">
                <span>UC-BE Electric</span>
                <span>Lap 14/20</span>
              </div>
              <div className="h-1.5 w-full bg-border-dark rounded-full overflow-hidden">
                <div className="h-full bg-accent-electric w-[72%]"></div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center px-3 py-1 bg-primary/20 rounded border border-primary/40">
              <span className="size-2 rounded-full bg-green-500 animate-pulse mr-2"></span>
              <span className="text-xs font-bold text-primary">SYSTEM: ONLINE</span>
            </div>
            <button className="flex items-center justify-center rounded-lg h-9 w-9 bg-border-dark hover:bg-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            {role === "engineer" ? (
              <button className="flex items-center justify-center rounded-lg h-9 w-9 bg-border-dark hover:bg-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">settings</span>
              </button>
            ) : null}
            <div className="flex items-center gap-2 pl-2">
              <div className="size-8 rounded-full bg-primary flex items-center justify-center font-bold text-xs">
                {email.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white/70 font-mono">
                  {email}
                </span>
                <span className="text-[9px] text-primary/80 font-mono uppercase">
                  {role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex grid-bg">
        <aside className="w-[320px] shrink-0 glass-panel border-y-0 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 bg-accent-hydrogen"></div>
            <h3 className="font-bold text-lg">PH-H2 TELEMETRY</h3>
          </div>
          <div className="relative h-40 flex flex-col items-center justify-center border border-border-dark rounded-xl bg-background-dark/50">
            <span className="text-xs text-slate-400 uppercase font-bold absolute top-3">
              Current Speed
            </span>
            <span className="text-5xl font-bold text-accent-hydrogen">42.5</span>
            <span className="text-sm font-medium text-slate-500">KM/H</span>
            <div className="mt-2 text-xs font-bold text-green-500">+2.1% ↑</div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-lg border border-border-dark bg-surface-dark/40">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                Fuel Efficiency
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">185</span>
                <span className="text-xs text-slate-500">km/m³</span>
              </div>
              <div className="mt-2 h-1 bg-border-dark rounded-full overflow-hidden">
                <div className="h-full bg-accent-hydrogen w-[85%]"></div>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-border-dark bg-surface-dark/40">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                Hydrogen Tank (LEL)
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">45</span>
                <span className="text-xs text-slate-500">% Remaining</span>
              </div>
              <div className="mt-2 h-1.5 bg-border-dark rounded-full overflow-hidden">
                <div className="h-full bg-accent-hydrogen w-[45%]"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border-dark bg-surface-dark/20 text-center">
                <p className="text-[8px] text-slate-500 uppercase font-bold">Temp</p>
                <p className="text-lg font-bold">34°C</p>
              </div>
              <div className="p-3 rounded-lg border border-border-dark bg-surface-dark/20 text-center">
                <p className="text-[8px] text-slate-500 uppercase font-bold">Voltage</p>
                <p className="text-lg font-bold">24.2V</p>
              </div>
            </div>
          </div>
          <div className="mt-auto p-4 rounded-xl border border-border-dark bg-surface-dark">
            <p className="text-xs font-bold text-center mb-4 uppercase text-slate-400 tracking-widest">
              Sector Performance
            </p>
            <div className="flex items-end justify-between h-24 px-2">
              <div className="w-4 bg-accent-hydrogen/40 h-[40%] rounded-t"></div>
              <div className="w-4 bg-accent-hydrogen/60 h-[65%] rounded-t"></div>
              <div className="w-4 bg-accent-hydrogen h-[90%] rounded-t"></div>
              <div className="w-4 bg-accent-hydrogen/50 h-[30%] rounded-t"></div>
              <div className="w-4 bg-accent-hydrogen/80 h-[75%] rounded-t"></div>
            </div>
            <div className="flex justify-between text-[8px] mt-2 text-slate-500 font-bold">
              <span>S1</span>
              <span>S2</span>
              <span>S3</span>
              <span>S4</span>
              <span>S5</span>
            </div>
          </div>
        </aside>

        <section className="flex-1 flex flex-col relative min-h-[600px]">
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <button className="bg-surface-dark p-2 rounded-lg border border-border-dark shadow-2xl hover:bg-primary transition-colors">
              <span className="material-symbols-outlined">layers</span>
            </button>
            <button className="bg-surface-dark p-2 rounded-lg border border-border-dark shadow-2xl hover:bg-primary transition-colors">
              <span className="material-symbols-outlined">near_me</span>
            </button>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 z-0 grayscale-[0.2] opacity-80 pointer-events-none">
              <img
                alt="Satellite view of Mandalika circuit racetrack"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWz7sh1L3QuucQqfQv71VR_QwhwooFKCynlqeKA89bn-dklHMaeImJjblYvj3K2VU96wX3vG8pxyUyIOzUI-QRu2v9AAT8ow1KIoqFZJGea2AO5IIBIhHJ_zW8f75_qfDEIrA9esNOiePcbxBVbshqtePIuezUf5tO-XWbS331o_s_SG_a1Z3nu_841j8BhEhebzrW79TGnHZSRTy9YyNm0KDJ06r4iLFLT3U1wqbkMrTeH4VS6ZbtXqlXBTUk6DlbwORBuZM3W_SU"
              />
            </div>
            <div className="absolute inset-0 map-gradient pointer-events-none"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-[80%] h-[80%] border-4 border-white/5 rounded-full rotate-[12deg]">
                <div className="absolute top-[15%] left-[65%] size-6 flex flex-col items-center">
                  <div className="size-3 bg-accent-hydrogen border-2 border-white rounded-full shadow-[0_0_15px_#3b82f6]"></div>
                  <span className="mt-1 text-[8px] font-bold bg-background-dark/80 px-1">PH-H2</span>
                </div>
                <div className="absolute top-[85%] left-[25%] size-6 flex flex-col items-center">
                  <div className="size-3 bg-accent-electric border-2 border-white rounded-full shadow-[0_0_15px_#10b981]"></div>
                  <span className="mt-1 text-[8px] font-bold bg-background-dark/80 px-1">UC-BE</span>
                </div>
              </div>
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 w-max">
              <div className="px-6 py-4 glass-panel rounded-xl flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Estimated Finish</span>
                  <span className="text-xl font-bold text-white">14:32:05</span>
                </div>
                <div className="w-px h-8 bg-border-dark"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Track Temp</span>
                  <span className="text-xl font-bold text-white">52.4°C</span>
                </div>
                <div className="w-px h-8 bg-border-dark"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Wind Speed</span>
                  <span className="text-xl font-bold text-white">12 km/h NW</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-20 border-t border-border-dark bg-background-dark flex items-center overflow-hidden">
            <div className="bg-critical h-full px-4 flex items-center shrink-0">
              <span className="material-symbols-outlined mr-2">warning</span>
              <span className="font-bold text-xs">CRITICAL ALERTS</span>
            </div>
            <div className="flex-1 flex gap-8 items-center px-6 overflow-x-hidden whitespace-nowrap">
              <div className="flex items-center gap-2 text-critical animate-pulse">
                <span className="text-[10px] font-bold px-2 py-0.5 border border-critical rounded">14:02</span>
                <span className="text-sm font-medium">
                  PH-H2: Fuel cell temperature exceeding nominal limits (72°C)
                </span>
              </div>
              <div className="flex items-center gap-2 text-warning">
                <span className="text-[10px] font-bold px-2 py-0.5 border border-warning rounded">13:58</span>
                <span className="text-sm font-medium">
                  UC-BE: Voltage drop detected in Sector 3 recovery
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 opacity-50">
                <span className="text-[10px] font-bold px-2 py-0.5 border border-slate-700 rounded">13:55</span>
                <span className="text-sm font-medium">
                  System: Lap 13 telemetry archived successfully
                </span>
              </div>
            </div>
          </div>
        </section>

        <aside className="w-[320px] shrink-0 glass-panel border-y-0 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 bg-accent-electric"></div>
            <h3 className="font-bold text-lg">UC-BE TELEMETRY</h3>
          </div>
          <div className="relative h-40 flex flex-col items-center justify-center border border-border-dark rounded-xl bg-background-dark/50">
            <span className="text-xs text-slate-400 uppercase font-bold absolute top-3">
              Current Speed
            </span>
            <span className="text-5xl font-bold text-accent-electric">38.2</span>
            <span className="text-sm font-medium text-slate-500">KM/H</span>
            <div className="mt-2 text-xs font-bold text-critical">-0.5% ↓</div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-lg border border-border-dark bg-surface-dark/40">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                Energy Efficiency
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">212</span>
                <span className="text-xs text-slate-500">km/kWh</span>
              </div>
              <div className="mt-2 h-1 bg-border-dark rounded-full overflow-hidden">
                <div className="h-full bg-accent-electric w-[92%]"></div>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-border-dark bg-surface-dark/40">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                Battery SOC
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">88</span>
                <span className="text-xs text-slate-500">% Capacity</span>
              </div>
              <div className="mt-2 h-1.5 bg-border-dark rounded-full overflow-hidden">
                <div className="h-full bg-accent-electric w-[88%]"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border-dark bg-surface-dark/20 text-center">
                <p className="text-[8px] text-slate-500 uppercase font-bold">Temp</p>
                <p className="text-lg font-bold">31°C</p>
              </div>
              <div className="p-3 rounded-lg border border-border-dark bg-surface-dark/20 text-center">
                <p className="text-[8px] text-slate-500 uppercase font-bold">Voltage</p>
                <p className="text-lg font-bold">48.1V</p>
              </div>
            </div>
          </div>
          <div className="mt-auto p-4 rounded-xl border border-primary/40 bg-primary/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-sm">psychology</span>
              <p className="text-xs font-bold uppercase text-primary tracking-widest">ML Strategist</p>
            </div>
            <div className="space-y-3">
              <div className="p-2 bg-background-dark/40 rounded border border-border-dark text-[10px] leading-relaxed">
                <span className="text-accent-electric font-bold">UC-BE:</span> Increase throttle by 5% in Sector 2.
                Predicted finish: <span className="text-green-500 font-bold">P1</span>.
              </div>
              <div className="p-2 bg-background-dark/40 rounded border border-border-dark text-[10px] leading-relaxed">
                <span className="text-accent-hydrogen font-bold">PH-H2:</span> Adjust pressure valve to compensate for Sector 4 gradient.
              </div>
              <button className="w-full py-2 bg-primary text-[10px] font-bold uppercase rounded hover:bg-primary/80 transition-all">
                Apply Strategy Overrides
              </button>
            </div>
          </div>
        </aside>
      </main>

      <footer className="bg-surface-dark border-t border-border-dark px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Live Component Status Matrix
          </h4>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-accent-hydrogen"></div>
              <span className="text-[10px] font-bold uppercase">Hydrogen</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-accent-electric"></div>
              <span className="text-[10px] font-bold uppercase">Electric</span>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-border-dark bg-background-dark">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-dark/80 text-[10px] uppercase font-bold text-slate-500">
                <th className="px-4 py-3">Component Group</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Load/Health</th>
                <th className="px-4 py-3">Current Mode</th>
                <th className="px-4 py-3">Telemetry ID</th>
                <th className="px-4 py-3">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              <tr className="text-xs">
                <td className="px-4 py-3 font-medium">Power Distribution Unit</td>
                <td className="px-4 py-3 text-accent-electric font-bold">UC-BE</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1 bg-border-dark rounded-full">
                      <div className="h-full bg-accent-electric w-[78%]"></div>
                    </div>
                    <span>78%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-[10px] font-bold">
                    OPTIMAL
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono">PDU_48V_0X44</td>
                <td className="px-4 py-3 text-slate-500 italic">250ms ago</td>
              </tr>
              <tr className="text-xs">
                <td className="px-4 py-3 font-medium">Fuel Cell Stack B</td>
                <td className="px-4 py-3 text-accent-hydrogen font-bold">PH-H2</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1 bg-border-dark rounded-full">
                      <div className="h-full bg-warning w-[42%]"></div>
                    </div>
                    <span>42%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-warning/20 text-warning rounded text-[10px] font-bold">
                    WARNING
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono">H2_STCK_0XFA</td>
                <td className="px-4 py-3 text-slate-500 italic">112ms ago</td>
              </tr>
              <tr className="text-xs">
                <td className="px-4 py-3 font-medium">Motor Controller</td>
                <td className="px-4 py-3 text-accent-electric font-bold">UC-BE</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1 bg-border-dark rounded-full">
                      <div className="h-full bg-accent-electric w-[95%]"></div>
                    </div>
                    <span>95%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-[10px] font-bold">
                    ACTIVE
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono">MC_PWM_0X12</td>
                <td className="px-4 py-3 text-slate-500 italic">45ms ago</td>
              </tr>
            </tbody>
          </table>
        </div>
      </footer>
    </div>
    </AuthGate>
  );
}
