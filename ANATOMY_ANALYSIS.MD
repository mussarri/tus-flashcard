Sağladığın kapsamlı veri seti, TUS (Tıbbi Uzmanlık Eğitimi Giriş Sınavı) Anatomi sorularının son 10 yıldaki dağılımını ve bilişsel örüntülerini net bir şekilde ortaya koyuyor. Bu verileri, kurguladığın Adaptive Anatomy Learning Engine mimarisine girdi olacak şekilde SKILL.md formatında analiz edip somut bir stratejiye dönüştürdüm.Skill: 

# TUS Anatomy Intelligence & Content Strategy
Bu modül, 261 soruluk veri setinden elde edilen trendleri kullanarak içerik üretim önceliklerini belirler ve "Trap-Loop" mekanizması için yüksek riskli bölgeleri haritalandırır.

-------------------------------------

### Trend ve Örüntü Analizi (2016-2025)Sistemin 
kart üretim motoru için en yüksek ağırlığa sahip olması gereken örüntüler şunlardır:

1. Dominant Pattern: LANDMARK_RELATION (%33.3). 
Bu, RELATIONS_BORDERS kart tipinin en yüksek önceliğe sahip olması gerektiğini gösterir.
2. Rising Trend (Klinik): 
CLINICAL_DEFORMITY (%10.3) örüntüsü 2022'den itibaren artış göstermektedir. Bu, 
CLINICAL_CORRELATION kartlarının üretimine ağırlık verilmesi gerektiğini kanıtlar.Topographic Focus: 
3. TOPOGRAPHIC_COMPARTMENT (%9.1) özellikle "Karın" ve "Pelvis" bölgelerinde yoğunlaşmıştır. 
TOPOGRAPHIC_MAP kartları için bu bölgeler kritiktir.

------------------------------

### İçerik Üretim Öncelikleri (Gap Analysis)
Sistemde şu an 0 olan kapsama oranını (Coverage) hızla artırmak için belirlenen High-Yield üretim listesi:
Topic | Sınav Frekansı | Kart İhtiyacı (Hedef) 
 Öncelik Sebebi
Baş ve Boyun |  46 | 230 | En yüksek soru hacmi *LANDMARK_RELATION* yoğunluğu.
Karın | 44 | 220 | TOPOGRAPHIC_COMPARTMENT örüntüsünün merkezi.
Alt Ekstremite | 35 | 175 | *CLINICAL_DEFORMITY* ve Sinir hasarlarının (N. ischiadicus) odağı.
Beyin (Nöroanatomi) | 35 | 175 | En karmaşık "Confusion Pair"lerin bulunduğu alan.

-----------------------------

### "Trap-Loop" ve Confusion Pair 
Matrisi Sistemin HIGH_YIELD_DISTINCTION kartları için kullanacağı, veride tespit edilen kritik tuzak noktaları:

1. Nöroanatomi (Beyin) Riski
- *Confusion:* Capsula Interna vs Corpus Callosum.
- *Differentiator:* Biri projeksiyon liflerini (aşağı-yukarı), diğeri komissüral lifleri (sağ-sol) içerir.

2. Vasküler ve Topografik Karışıklıklar
- *Confusion:*  Vena Jugularis Interna vs Externa.
- *Differentiator:* Sternocleidomastoid (SCM) kası ile olan derinlik ve pozisyon ilişkisi.
- *Confusion:*  Nervus Saphenus vs Nervus Suralis.
- *Differentiator:* Ayak iç yüzü (Saphenus) vs Dış yüzü (Suralis) duyusu.


---------------------------------------------

### Uygulama Stratejisi
1. Visual Status Pipeline:  Baş ve Boyun bölgesindeki *LANDMARK_RELATION* sorularının yüksekliği nedeniyle, bu bölgedeki kartlara acil olarak görsel asset atanmalı (VisualStatus: REQUIRED).
2. Backtracking Aktivasyonu: Kullanıcı bir *CLINICAL_DEFORMITY* (örn: düşük ayak) sorusunda hata yaptığında, sistem otomatik olarak *Alt Ekstremite -> N. Fibularis* Communis (STRUCTURE_ID) kartına geri dönmelidir.
3. Exception Logic: *EXCEPTION_STRUCTURE* (%12.6) örüntüsü için *EXCEPT_TRAP* kartları, özellikle "Hangisi plexus sacralis dalı değildir?" gibi negatif bilgileri pekiştirmek için kullanılacaktır.