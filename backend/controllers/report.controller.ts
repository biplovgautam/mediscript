import type { Request, Response } from "express";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";
import ConsultationSession from "../models/consultationSession.model.js";
import ConsultationNote from "../models/consultationNote.model.js";
import Prescription from "../models/prescription.model.js";

const requireStringParam = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const toListItems = (value: string): string => {
  return value
    .split(/\n|;|•/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<li>${item}</li>`)
    .join("");
};

const renderTemplate = async (replacements: Record<string, string>) => {
  const templatePath = path.join(process.cwd(), "templates", "opd-card.html");
  let html = await fs.readFile(templatePath, "utf-8");
  Object.entries(replacements).forEach(([key, value]) => {
    html = html.replaceAll(key, value);
  });
  return html;
};

export const downloadOpdPdf = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const sessionId = requireStringParam(req.params.sessionId);
    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      res.status(400).json({ message: "Invalid session id" });
      return;
    }

    const session = await ConsultationSession.findOne({
      _id: sessionId,
      hospitalId: req.user.hospitalId,
      doctorId: req.user._id,
      isDeleted: false,
    }).populate("patientId", "fullName age sex");

    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    const [note, prescription] = await Promise.all([
      ConsultationNote.findOne({
        consultationSessionId: session._id,
        hospitalId: req.user.hospitalId,
      }).sort({ version: -1 }),
      Prescription.findOne({
        consultationSessionId: session._id,
        hospitalId: req.user.hospitalId,
      }).sort({ version: -1 }),
    ]);

    const patient = typeof session.patientId === "object" ? session.patientId : null;
    const age = patient?.age ? String(patient.age) : "-";
    const sex = patient?.sex ? String(patient.sex) : "-";
    const ageGender = `${age} / ${sex}`;

    const html = await renderTemplate({
      "{{cr_no}}": String(session._id).slice(-8).toUpperCase(),
      "{{patient_name}}": patient?.fullName || "Unknown",
      "{{age_gender}}": ageGender,
      "{{date}}": new Date(session.createdAt).toLocaleDateString(),
      "{{notes}}": note?.doctorNotes || note?.chiefComplaint || "-",
      "{{symptoms}}": (note?.symptoms || []).join(", ") || "-",
      "{{examination}}": note?.examinationFindings || "-",
      "{{issues}}": toListItems(note?.diagnosisSummary || "-"),
      "{{plan}}": toListItems(note?.plan || "-"),
      "{{advice}}": toListItems(prescription?.advice || "-"),
    });

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });
    await page.close();
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="opd-card-${sessionId}.pdf"`);
    res.send(pdf);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate PDF";
    res.status(500).json({ message });
  }
};
