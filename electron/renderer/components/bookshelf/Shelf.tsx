import React from "react";
import type { BookshelfItem } from "../../../preload/api";
import Book from "./Book";
import Folder from "./Folder";
import PinnedChart from "./PinnedChart";

interface Props {
  label: string;
  items: BookshelfItem[];
}

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".svg"]);
const DATA_EXTS = new Set([".json", ".csv"]);

export default function Shelf({ label, items }: Props) {
  // Separate image items (pinned charts), data items (folders), and draft items
  const imageItems = items.filter((it) => IMAGE_EXTS.has(it.ext));
  const dataItems = items.filter((it) => DATA_EXTS.has(it.ext));
  const draftItems = items.filter((it) => it.category === "draft");
  const bookItems = items.filter(
    (it) =>
      !IMAGE_EXTS.has(it.ext) &&
      !DATA_EXTS.has(it.ext) &&
      it.category !== "draft"
  );

  return (
    <div className="shelf">
      <div className="shelf-label">{label}</div>
      <div className="shelf-items">
        {bookItems.map((item) => (
          <Book key={item.path} item={item} />
        ))}
        {draftItems.length > 0 && (
          <Folder
            label="章节草稿"
            items={draftItems}
            color="#6A7A8C"
          />
        )}
        {dataItems.length > 0 && (
          <Folder
            label="数据"
            items={dataItems}
            color="#3A6A5C"
          />
        )}
        {imageItems.map((item) => (
          <PinnedChart key={item.path} item={item} />
        ))}
      </div>
      <div className="shelf-board" />
    </div>
  );
}
