import { X } from "lucide-react";

export type GridLayout = 
  | "free-floating"
  | "1-grid"
  | "2-grid-vertical"
  | "2-grid-horizontal"
  | "3-grid-rows"
  | "3-grid-columns"
  | "3-grid-left-large"
  | "3-grid-right-large"
  | "3-grid-top-large"
  | "3-grid-bottom-large"
  | "4-grid"
  | "4-grid-columns"
  | "4-grid-rows"
  | "4-grid-left-large"
  | "4-grid-right-large"
  | "4-grid-top-large"
  | "5-grid-rows"
  | "5-grid-columns"
  | "5-grid-complex"
  | "6-grid-2x3"
  | "6-grid-3x2"
  | "6-grid-left-large"
  | "7-grid-left"
  | "7-grid-large"
  | "8-grid-2x4"
  | "8-grid-4x2"
  | "8-grid-columns"
  | "8-grid-rows"
  | "9-grid"
  | "12-grid-3x4"
  | "12-grid-4x3"
  | "16-grid"
  | "24-grid-4x6"
  | "24-grid-6x4"
  | "24-grid-rows"
  | "24-grid-columns"
  | "28-grid-4x7"
  | "28-grid-7x4"
  | "32-grid-4x8"
  | "32-grid-8x4";

interface LayoutSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLayout: (layout: GridLayout) => void;
}

interface GridButtonProps {
  layout: GridLayout;
  onClick: () => void;
  children: React.ReactNode;
}

function GridButton({ onClick, children }: GridButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-12 h-12 bg-background hover:bg-popover border border-border hover:border-primary/50 rounded p-1.5 transition-all group"
    >
      {children}
    </button>
  );
}

export function LayoutSelector({ isOpen, onClose, onSelectLayout }: LayoutSelectorProps) {
  const handleLayoutClick = (layout: GridLayout) => {
    onSelectLayout(layout);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-[125] transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-[500px] bg-widget-body border-r border-border shadow-2xl z-[130] flex flex-col transition-transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg text-foreground">Select Layout</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-popover rounded transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Free Floating */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">∞</div>
            <div className="flex gap-3">
              <button
                onClick={() => handleLayoutClick("free-floating")}
                className="w-24 h-12 bg-background hover:bg-popover border border-border hover:border-primary/50 rounded p-1.5 transition-all group"
              >
                <div className="w-full h-full border-2 border-dashed border-[#4a4a4a] rounded group-hover:border-primary/50 flex items-center justify-center">
                  <div className="text-xs text-muted-foreground group-hover:text-primary/70 font-medium">
                    Free Floating
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 1 Grid */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">1</div>
            <div className="flex gap-3">
              <GridButton layout="1-grid" onClick={() => handleLayoutClick("1-grid")}>
                <div className="w-full h-full border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
              </GridButton>
            </div>
          </div>

          {/* 2 Grid */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">2</div>
            <div className="flex gap-3">
              <GridButton layout="2-grid-vertical" onClick={() => handleLayoutClick("2-grid-vertical")}>
                <div className="w-full h-full flex gap-1">
                  <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
              <GridButton layout="2-grid-horizontal" onClick={() => handleLayoutClick("2-grid-horizontal")}>
                <div className="w-full h-full flex flex-col gap-1">
                  <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
            </div>
          </div>

          {/* 3 Grid */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">3</div>
            <div className="flex gap-3 flex-wrap">
              <GridButton layout="3-grid-rows" onClick={() => handleLayoutClick("3-grid-rows")}>
                <div className="w-full h-full flex flex-col gap-0.5">
                  <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
              <GridButton layout="3-grid-columns" onClick={() => handleLayoutClick("3-grid-columns")}>
                <div className="w-full h-full flex gap-0.5">
                  <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
              <GridButton layout="3-grid-left-large" onClick={() => handleLayoutClick("3-grid-left-large")}>
                <div className="w-full h-full flex gap-0.5">
                  <div className="flex-[2] border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  </div>
                </div>
              </GridButton>
              <GridButton layout="3-grid-right-large" onClick={() => handleLayoutClick("3-grid-right-large")}>
                <div className="w-full h-full flex gap-0.5">
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  </div>
                  <div className="flex-[2] border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
              <GridButton layout="3-grid-top-large" onClick={() => handleLayoutClick("3-grid-top-large")}>
                <div className="w-full h-full flex flex-col gap-0.5">
                  <div className="flex-[2] border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="flex-1 flex gap-0.5">
                    <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  </div>
                </div>
              </GridButton>
              <GridButton layout="3-grid-bottom-large" onClick={() => handleLayoutClick("3-grid-bottom-large")}>
                <div className="w-full h-full flex flex-col gap-0.5">
                  <div className="flex-1 flex gap-0.5">
                    <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  </div>
                  <div className="flex-[2] border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
            </div>
          </div>

          {/* 4 Grid */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">4</div>
            <div className="flex gap-3 flex-wrap">
              <GridButton layout="4-grid" onClick={() => handleLayoutClick("4-grid")}>
                <div className="w-full h-full grid grid-cols-2 gap-0.5">
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
              <GridButton layout="4-grid-columns" onClick={() => handleLayoutClick("4-grid-columns")}>
                <div className="w-full h-full grid grid-cols-4 gap-0.5">
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
              <GridButton layout="4-grid-rows" onClick={() => handleLayoutClick("4-grid-rows")}>
                <div className="w-full h-full grid grid-rows-4 gap-0.5">
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
              <GridButton layout="4-grid-left-large" onClick={() => handleLayoutClick("4-grid-left-large")}>
                <div className="w-full h-full flex gap-0.5">
                  <div className="flex-[2] border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="flex-1 grid grid-rows-3 gap-0.5">
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  </div>
                </div>
              </GridButton>
              <GridButton layout="4-grid-right-large" onClick={() => handleLayoutClick("4-grid-right-large")}>
                <div className="w-full h-full flex gap-0.5">
                  <div className="flex-1 grid grid-rows-3 gap-0.5">
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  </div>
                  <div className="flex-[2] border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
              <GridButton layout="4-grid-top-large" onClick={() => handleLayoutClick("4-grid-top-large")}>
                <div className="w-full h-full flex flex-col gap-0.5">
                  <div className="flex-[2] border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="flex-1 grid grid-cols-3 gap-0.5">
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  </div>
                </div>
              </GridButton>
            </div>
          </div>

          {/* 5 Grid */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">5</div>
            <div className="flex gap-3">
              <GridButton layout="5-grid-rows" onClick={() => handleLayoutClick("5-grid-rows")}>
                <div className="w-full h-full grid grid-rows-5 gap-0.5">
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
              <GridButton layout="5-grid-columns" onClick={() => handleLayoutClick("5-grid-columns")}>
                <div className="w-full h-full grid grid-cols-5 gap-0.5">
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
              <GridButton layout="5-grid-complex" onClick={() => handleLayoutClick("5-grid-complex")}>
                <div className="w-full h-full flex flex-col gap-0.5">
                  <div className="flex gap-0.5">
                    <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  </div>
                  <div className="flex gap-0.5">
                    <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="flex-1 border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  </div>
                </div>
              </GridButton>
            </div>
          </div>

          {/* 6 Grid */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">6</div>
            <div className="flex gap-3">
              <GridButton layout="6-grid-2x3" onClick={() => handleLayoutClick("6-grid-2x3")}>
                <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-0.5">
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
              <GridButton layout="6-grid-3x2" onClick={() => handleLayoutClick("6-grid-3x2")}>
                <div className="w-full h-full grid grid-cols-2 grid-rows-3 gap-0.5">
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
              <GridButton layout="6-grid-left-large" onClick={() => handleLayoutClick("6-grid-left-large")}>
                <div className="w-full h-full flex gap-0.5">
                  <div className="flex-[2] border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="flex-1 grid grid-rows-5 gap-0.5">
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  </div>
                </div>
              </GridButton>
            </div>
          </div>

          {/* 7 Grid */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">7</div>
            <div className="flex gap-3">
              <GridButton layout="7-grid-left" onClick={() => handleLayoutClick("7-grid-left")}>
                <div className="w-full h-full flex gap-0.5">
                  <div className="flex-1 grid grid-rows-4 gap-0.5">
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  </div>
                  <div className="flex-1 grid grid-rows-3 gap-0.5">
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  </div>
                </div>
              </GridButton>
              <GridButton layout="7-grid-large" onClick={() => handleLayoutClick("7-grid-large")}>
                <div className="w-full h-full flex gap-0.5">
                  <div className="flex-[2] border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="flex-1 grid grid-rows-6 gap-0.5">
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                    <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  </div>
                </div>
              </GridButton>
            </div>
          </div>

          {/* 8 Grid */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">8</div>
            <div className="flex gap-3">
              <GridButton layout="8-grid-4x2" onClick={() => handleLayoutClick("8-grid-4x2")}>
                <div className="w-full h-full grid grid-cols-4 grid-rows-2 gap-0.5">
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
              <GridButton layout="8-grid-2x4" onClick={() => handleLayoutClick("8-grid-2x4")}>
                <div className="w-full h-full grid grid-cols-2 grid-rows-4 gap-0.5">
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
            </div>
          </div>

          {/* 9 Grid */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">9</div>
            <div className="flex gap-3">
              <GridButton layout="9-grid" onClick={() => handleLayoutClick("9-grid")}>
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0.5">
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  <div className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                </div>
              </GridButton>
            </div>
          </div>

          {/* 12 Grid */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">12</div>
            <div className="flex gap-3">
              <GridButton layout="12-grid-3x4" onClick={() => handleLayoutClick("12-grid-3x4")}>
                <div className="w-full h-full grid grid-cols-4 grid-rows-3 gap-0.5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  ))}
                </div>
              </GridButton>
              <GridButton layout="12-grid-4x3" onClick={() => handleLayoutClick("12-grid-4x3")}>
                <div className="w-full h-full grid grid-cols-3 grid-rows-4 gap-0.5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  ))}
                </div>
              </GridButton>
            </div>
          </div>

          {/* 16 Grid */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">16</div>
            <div className="flex gap-3">
              <GridButton layout="16-grid" onClick={() => handleLayoutClick("16-grid")}>
                <div className="w-full h-full grid grid-cols-4 grid-rows-4 gap-0.5">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  ))}
                </div>
              </GridButton>
            </div>
          </div>

          {/* 24 Grid */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">24</div>
            <div className="flex gap-3">
              <GridButton layout="24-grid-4x6" onClick={() => handleLayoutClick("24-grid-4x6")}>
                <div className="w-full h-full grid grid-cols-4 grid-rows-6 gap-0.5">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  ))}
                </div>
              </GridButton>
              <GridButton layout="24-grid-6x4" onClick={() => handleLayoutClick("24-grid-6x4")}>
                <div className="w-full h-full grid grid-cols-6 grid-rows-4 gap-0.5">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  ))}
                </div>
              </GridButton>
            </div>
          </div>

          {/* 28 Grid */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-8 text-foreground text-lg font-semibold">28</div>
            <div className="flex gap-3">
              <GridButton layout="28-grid-4x7" onClick={() => handleLayoutClick("28-grid-4x7")}>
                <div className="w-full h-full grid grid-cols-4 grid-rows-7 gap-0.5">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div key={i} className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  ))}
                </div>
              </GridButton>
              <GridButton layout="28-grid-7x4" onClick={() => handleLayoutClick("28-grid-7x4")}>
                <div className="w-full h-full grid grid-cols-7 grid-rows-4 gap-0.5">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div key={i} className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  ))}
                </div>
              </GridButton>
            </div>
          </div>

          {/* 32 Grid */}
          <div className="flex items-start gap-6">
            <div className="w-8 text-foreground text-lg font-semibold">32</div>
            <div className="flex gap-3">
              <GridButton layout="32-grid-4x8" onClick={() => handleLayoutClick("32-grid-4x8")}>
                <div className="w-full h-full grid grid-cols-4 grid-rows-8 gap-0.5">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={i} className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  ))}
                </div>
              </GridButton>
              <GridButton layout="32-grid-8x4" onClick={() => handleLayoutClick("32-grid-8x4")}>
                <div className="w-full h-full grid grid-cols-8 grid-rows-4 gap-0.5">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={i} className="border-2 border-[#4a4a4a] rounded group-hover:border-primary/50"></div>
                  ))}
                </div>
              </GridButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}