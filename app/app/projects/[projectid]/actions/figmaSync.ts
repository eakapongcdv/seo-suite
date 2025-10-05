"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureOwner } from "./_shared";
import {
  figmaGetImagesForProject,
  getFigmaNodeDocumentForProject,
  collectTextFromNode,
  extractKeywordsSimple,
  parseNodeIdFromInput,
  isValidNodeId,
} from "@/lib/figma";

export async function syncFigmaAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const pageId = String(formData.get("pageId") || "");
  const projectId = String(formData.get("projectId") || "");
  const figmaNodeIdRaw = String(formData.get("figmaNodeId") || "").trim();

  try {
    if (!figmaNodeIdRaw) {
      return { ok: false, error: "Missing Figma node id" };
    }

    const ok = await ensureOwner(projectId);
    if (!ok) {
      return { ok: false, error: "Unauthorized" };
    }

    // รองรับหลาย node คั่น comma/เว้นวรรค
    const rawList = figmaNodeIdRaw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    // แปลงเป็น node-id ที่ valid (รองรับ URL / 1-23 / 1%3A23 / 1:23)
    let nodeIds: string[] = [];
    try {
      nodeIds = rawList.map(parseNodeIdFromInput);
    } catch (e: any) {
      return {
        ok: false,
        error:
          e?.message ||
          'Invalid Figma node id. Use format like "1:23" or paste a Figma URL containing "?node-id=1-23".',
      };
    }

    const invalid = nodeIds.filter((id) => !isValidNodeId(id));
    if (invalid.length) {
      return {
        ok: false,
        error: `Invalid node id(s): ${invalid.join(
          ", "
        )}. Expected something like "1:23".`,
      };
    }

    const primaryId = nodeIds[0];

    // ดึงรูป
    const imagesMap = await figmaGetImagesForProject(projectId, nodeIds);
    const dashedPrimaryId = primaryId.replace(":", "-");
    const captureUrl =
      imagesMap[primaryId] ||
      imagesMap[dashedPrimaryId] ||
      imagesMap[nodeIds[0]] ||
      "";

    // ดึงข้อความจาก document เพื่อ extract keywords
    const doc = await getFigmaNodeDocumentForProject(projectId, primaryId);
    const text = doc ? collectTextFromNode(doc) : "";
    const keywords = text ? extractKeywordsSimple(text, 30) : [];

    await prisma.page.update({
      where: { id: pageId },
      data: {
        figmaNodeId: figmaNodeIdRaw, // เก็บค่าที่ผู้ใช้กรอกไว้
        figmaCaptureUrl: captureUrl || undefined,
        figmaCapturedAt: new Date(),
        figmaTextContent: text || undefined,
        pageContentKeywords: keywords,
      },
    });

    revalidatePath(`/app/projects/${projectId}`);
    return { ok: true };
  } catch (err: any) {
    console.error("[syncFigmaAction] failed:", err);
    return { ok: false, error: err?.message || "Figma sync failed" };
  }
}
