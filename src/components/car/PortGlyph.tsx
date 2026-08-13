import type { ChargingPort } from "@/types/car";

export const PORT_GLYPH_SRC: Record<ChargingPort, string> = {
  CCS1: "/car/ports/ccs.svg",
  CHADEMO: "/car/ports/chademo.svg",
  NACS: "/car/ports/nacs.svg",
};

export function PortGlyph({
  port,
  className = "h-8 w-8 object-contain",
}: {
  port: ChargingPort;
  className?: string;
}) {
  return (
    <img
      src={PORT_GLYPH_SRC[port]}
      alt=""
      className={className}
      draggable={false}
    />
  );
}
