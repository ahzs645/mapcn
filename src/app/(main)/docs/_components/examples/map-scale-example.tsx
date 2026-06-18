import { Map } from "@/registry/map";
import { MapScale, type MapScaleProps } from "@/registry/map-scale";

export function MapScaleVariantExample({
  variant,
  dual,
}: {
  variant: MapScaleProps["variant"];
  dual?: boolean;
}) {
  return (
    <div className="h-[420px] w-full">
      <Map center={[2.3522, 48.8566]} zoom={9}>
        <MapScale position="bottom-left" variant={variant} dual={dual} />
      </Map>
    </div>
  );
}
