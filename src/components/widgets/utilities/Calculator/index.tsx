import { useState } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { Button } from "@/components/ui/button";
import { Divide, X as Multiply, Minus, Plus } from "lucide-react";

interface CalculatorProps {
  wgid?: string;
  onSettings?: () => void;
  onRemove?: () => void;
  settings?: Record<string, any>;
}

export default function Calculator({ onSettings, onRemove, settings }: CalculatorProps) {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case "+":
        return firstValue + secondValue;
      case "-":
        return firstValue - secondValue;
      case "×":
        return firstValue * secondValue;
      case "÷":
        return firstValue / secondValue;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const handlePercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const handleToggleSign = () => {
    if (display !== "0") {
      setDisplay(display.charAt(0) === "-" ? display.slice(1) : "-" + display);
    }
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  return (
    <div className="w-full h-full bg-widget-body border border-border rounded-none flex flex-col">
      <WidgetHeader 
        title="Calculator" 
        onSettings={onSettings}
        onRemove={onRemove}
      />
      
      <div className="flex-1 flex flex-col p-4 gap-2">
        {/* Display */}
        <div className="bg-black/40 border border-border/60 rounded p-4 h-20 flex items-center justify-end">
          <div className="text-right text-2xl font-mono text-foreground overflow-x-auto w-full">
            {display}
          </div>
        </div>

        {/* Button Grid */}
        <div className="grid grid-cols-4 gap-2 flex-1">
          {/* Row 1 */}
          <Button
            variant="outline"
            className="h-12 bg-widget-header hover:bg-muted text-foreground"
            onClick={clear}
          >
            C
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-widget-header hover:bg-muted text-foreground"
            onClick={handleToggleSign}
          >
            ±
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-widget-header hover:bg-muted text-foreground"
            onClick={handlePercent}
          >
            %
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-primary/20 hover:bg-primary/30 text-primary border-primary/30"
            onClick={() => performOperation("÷")}
          >
            <Divide className="w-4 h-4" />
          </Button>

          {/* Row 2 */}
          <Button
            variant="outline"
            className="h-12 bg-background hover:bg-muted text-foreground"
            onClick={() => inputNumber("7")}
          >
            7
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-background hover:bg-muted text-foreground"
            onClick={() => inputNumber("8")}
          >
            8
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-background hover:bg-muted text-foreground"
            onClick={() => inputNumber("9")}
          >
            9
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-primary/20 hover:bg-primary/30 text-primary border-primary/30"
            onClick={() => performOperation("×")}
          >
            <Multiply className="w-4 h-4" />
          </Button>

          {/* Row 3 */}
          <Button
            variant="outline"
            className="h-12 bg-background hover:bg-muted text-foreground"
            onClick={() => inputNumber("4")}
          >
            4
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-background hover:bg-muted text-foreground"
            onClick={() => inputNumber("5")}
          >
            5
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-background hover:bg-muted text-foreground"
            onClick={() => inputNumber("6")}
          >
            6
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-primary/20 hover:bg-primary/30 text-primary border-primary/30"
            onClick={() => performOperation("-")}
          >
            <Minus className="w-4 h-4" />
          </Button>

          {/* Row 4 */}
          <Button
            variant="outline"
            className="h-12 bg-background hover:bg-muted text-foreground"
            onClick={() => inputNumber("1")}
          >
            1
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-background hover:bg-muted text-foreground"
            onClick={() => inputNumber("2")}
          >
            2
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-background hover:bg-muted text-foreground"
            onClick={() => inputNumber("3")}
          >
            3
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-primary/20 hover:bg-primary/30 text-primary border-primary/30"
            onClick={() => performOperation("+")}
          >
            <Plus className="w-4 h-4" />
          </Button>

          {/* Row 5 */}
          <Button
            variant="outline"
            className="h-12 bg-background hover:bg-muted text-foreground col-span-2"
            onClick={() => inputNumber("0")}
          >
            0
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-background hover:bg-muted text-foreground"
            onClick={inputDecimal}
          >
            .
          </Button>
          <Button
            variant="outline"
            className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleEquals}
          >
            =
          </Button>
        </div>

        {/* Additional Functions Row */}
        <div className="grid grid-cols-4 gap-2">
          <Button
            variant="outline"
            className="h-10 bg-widget-header hover:bg-muted text-foreground text-xs"
            onClick={handleBackspace}
            title="Backspace"
          >
            ⌫
          </Button>
          <Button
            variant="outline"
            className="h-10 bg-widget-header hover:bg-muted text-foreground text-xs"
            onClick={() => setDisplay("0")}
          >
            CE
          </Button>
          <Button
            variant="outline"
            className="h-10 bg-widget-header hover:bg-muted text-foreground text-xs col-span-2"
            onClick={() => {
              // Memory functions placeholder
            }}
          >
            M+
          </Button>
        </div>
      </div>
    </div>
  );
}

