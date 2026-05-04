import { spawn } from "node:child_process";
import type { TtsClient } from "./tts-client.js";

export interface EdgeTtsOpts {
  voice: string;
  rate: string;
  volume: string;
  pitch: string;
  pythonCommand: string;
}

/**
 * Microsoft Edge online TTS via the Python `edge-tts` package.
 *
 * Install once with:
 *   python -m pip install edge-tts
 *
 * No API key is required. The provider can also emit VTT subtitles; the
 * pipeline passes an .srt path, but downstream code currently only relies on
 * the generated mp3, so we keep the subtitle output best-effort.
 */
export class EdgeTtsClient implements TtsClient {
  constructor(private cfg: EdgeTtsOpts) {}

  async generate(text: string, audioOutPath: string, srtOutPath?: string): Promise<void> {
    const args = [
      "-m",
      "edge_tts",
      "--voice",
      this.cfg.voice,
      "--text",
      text,
      "--rate",
      this.cfg.rate,
      "--volume",
      this.cfg.volume,
      "--pitch",
      this.cfg.pitch,
      "--write-media",
      audioOutPath,
    ];

    if (srtOutPath) {
      args.push("--write-subtitles", srtOutPath);
    }

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(this.cfg.pythonCommand, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stderr = "";
      proc.stderr.on("data", (d) => {
        stderr += d.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`edge-tts failed with exit code ${code}: ${stderr.trim()}`));
        }
      });

      proc.on("error", (err) => {
        reject(
          new Error(
            `Failed to start edge-tts via "${this.cfg.pythonCommand}". ` +
            `Install it with: python -m pip install edge-tts. ${err.message}`,
          ),
        );
      });
    });
  }
}
