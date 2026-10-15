"use client";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import ui from "../../ui/meri-ui.module.css";
import {
  RequestChangesDialog,
  type RequestChangesView,
} from "./RequestChangesDialog";

export type RequestChangesScreenView = {
  title: string;
  description: string;
  requestChanges: RequestChangesView;
};

/** 06.02B and 06.07A: reviewer feedback on one pending proposal, before it is sent. */
export function RequestChangesScreen({
  view,
  unavailable,
}: {
  view: RequestChangesScreenView;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.description} />
      <RequestChangesDialog
        view={view.requestChanges}
        unavailable={unavailable}
      />
    </div>
  );
}
