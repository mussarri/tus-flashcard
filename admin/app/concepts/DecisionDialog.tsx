"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export function ConceptRulesDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Concept Kuralları
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Concept Nedir? Ne Zaman Oluşturulur?</DialogTitle>
        </DialogHeader>

        {/* SECTION 1 */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Concept OLABİLİR
          </h3>

          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>Tekil ve iyi tanımlı bir yapı / mekanizma ise</li>
            <li>TUS sorularında doğrudan hedef alınıyorsa</li>
            <li>Yanlış–doğru ayrımı bu kavram üzerinden yapılıyorsa</li>
            <li>Başka sorularda tekrar tekrar geçiyorsa</li>
          </ul>

          <div className="text-xs text-muted-foreground">
            Örnekler:
            <br />• Chorda tympani
            <br />• Starling kuvvetleri
            <br />• Aksiyon potansiyeli fazları
          </div>
        </section>

        {/* SECTION 2 */}
        <section className="space-y-3 pt-4 border-t">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            Concept OLMAMALI
          </h3>

          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>Çok geniş / kapsayıcı başlık ise</li>
            <li>Altında birçok farklı yapı veya mekanizma varsa</li>
            <li>Tek başına soru çözdürmüyorsa</li>
            <li>Daha çok “konu başlığı” gibi duruyorsa</li>
          </ul>

          <div className="text-xs text-muted-foreground">
            Örnekler:
            <br />• Kalp
            <br />• Beyin
            <br />• Sinir sistemi
          </div>
        </section>

        {/* SECTION 3 */}
        <section className="space-y-3 pt-4 border-t">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            Sınırda Kavramlar
          </h3>

          <p className="text-sm">Eğer emin değilsen:</p>

          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>
              Önce <b>prerequisite</b> olarak bırak
            </li>
            <li>Unresolved Hint olarak kaydet</li>
            <li>Sık tekrar ederse concept’e yükselt</li>
          </ul>
        </section>

        {/* SECTION 4 */}
        <section className="space-y-3 pt-4 border-t">
          <h3 className="text-sm font-semibold">Altın Kural</h3>

          <p className="text-sm font-medium text-primary">
            “Bu kavram bilinmeden soru çözülemez mi?”
          </p>

          <p className="text-sm text-muted-foreground">
            Eğer cevap <b>evet</b> ise → Concept
            <br />
            Eğer cevap <b>hayır</b> ise → Topic / Subtopic / Prerequisite
          </p>
        </section>
      </DialogContent>
    </Dialog>
  );
}
