import { DownloadTimelines } from "../../../utils/data.ts";

type Props = {
  downloads: DownloadTimelines;
  version?: string;
};

export function Sparkline(props: Props) {
  const timeline = props.downloads[props.version ?? "total"];
  const max = Math.max(...timeline.map((point) => point.value));
  return (
    <div class="flex flex-row gap-[2px] h-[1rem]">
      {timeline.map((point) => (
        <div
          className="h-full flex flex-col-reverse"
          title={`${point.date}: ${point.value}`}
        >
          <div
            className="w-2 bg-current"
            style={{ height: `${100 * (point.value / max)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
