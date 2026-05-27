# Com instal·lar Caliu

**Caliu** és el teu Netflix casolà. Segueix aquests passos i en 10 minuts tindràs les teves pròpies pel·lícules i sèries disponibles a tots els dispositius de casa.

---

## Abans de començar

Necessites:
- Un **ordinador Windows** que estigui encès quan vulguis veure contingut
- Almenys **100 GB lliures** al disc (un disc dur extern va perfecte)
- Connexió a internet per descarregar els programes

---

## Pas 1 — Instal·la Docker Desktop

Caliu utilitza Docker per funcionar. És gratuït i només cal instal·lar-lo una vegada.

1. Ves a [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
2. Fes clic a **"Download for Windows"**
3. Obre el fitxer descarregat i segueix l'instal·lador
4. Reinicia l'ordinador si ho demana
5. Obre **Docker Desktop** i espera que aparegui la pantalla principal

> ⚠️ Docker Desktop ha d'estar obert cada vegada que vulguis utilitzar Caliu.

---

## Pas 2 — Instal·la Caliu

1. Descarrega **`Caliu-Setup.exe`** des de [caliu.app](https://caliu.app)
2. Fes doble clic al fitxer descarregat
3. Si Windows avisa de "programa desconegut", fes clic a **"Més informació" → "Executa igualment"**
4. Caliu s'instal·larà automàticament i s'obrirà

---

## Pas 3 — Configura Caliu

El wizard de Caliu et guiarà pas a pas:

### 🐳 Comprovació de Docker
Caliu comprova que Docker Desktop estigui funcionant. Si no, et mostrarà un botó per descarregar-lo.

### 📁 Carpeta de medis
Selecciona on vols guardar les teves pel·lícules i sèries. Recomanem una carpeta en un disc dur amb molt d'espai.

### 🔑 Contrasenya d'administrador
Crea una contrasenya per accedir al panell de control. Guarda-la bé!

### 🔒 VPN (opcional)
Per protegir les teves descàrregues recomanem **Mullvad VPN** (5€/mes). Si no en vols, pots continuar sense.

### ⚙️ Instal·lació
Caliu descarrega i configura tots els serveis automàticament. La primera vegada pot trigar **5-10 minuts**.

---

## Pas 4 — Comença a utilitzar-ho

Un cop instal·lat, veuràs els accessos directes a tots els serveis:

| Servei | Per a què serveix |
|---|---|
| 🎬 **Jellyfin** | Veure les teves pel·lícules i sèries |
| 🔍 **Jellyseerr** | Demanar contingut nou |
| 🎥 **Radarr** | Gestió de pel·lícules |
| 📺 **Sonarr** | Gestió de sèries |

### Accedir des d'altres dispositius (mòbil, TV, tauleta)

1. Descarrega l'app **Jellyfin** al teu dispositiu
2. Afegeix el servidor: `http://IP_DE_L_ORDINADOR:8096`
   - Per saber la IP: a l'ordinador, obre el símbol del sistema i escriu `ipconfig`
   - Busca "Adreça IPv4", p. ex: `192.168.1.42`
3. Inicia sessió amb l'usuari i contrasenya que has creat

---

## Problemes habituals

**Docker Desktop no arrenca**
→ Reinicia l'ordinador. Si continua, desinstal·la i torna a instal·lar Docker Desktop.

**La instal·lació es queda penjada**
→ Comprova que Docker Desktop estigui obert i que tinguis connexió a internet.

**No puc accedir des del mòbil**
→ Assegura't que el mòbil i l'ordinador estiguin a la mateixa xarxa Wi-Fi.

**He oblidat la contrasenya**
→ Obre Caliu des del menú d'inici i accedeix a la configuració.

---

## Desinstal·lar Caliu

1. Ves a **Configuració → Aplicacions** de Windows
2. Busca "Caliu" i fes clic a **Desinstal·lar**
3. La teva carpeta de medis **no s'esborrarà** — les teves dades estan segures

---

*Caliu és gratuït i de codi obert. Si t'ha estat útil, considera [fer una donació ☕](https://ko-fi.com/caliu)*
