import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({})

const PROMPT = `Tu analyses un document commercial (facture, devis, proforma ou bon de commande).
Extrais chaque ligne d'article et renvoie UNIQUEMENT un tableau JSON, sans texte autour, de la forme :
[{"ref": "référence ou code article (ou \\"-\\")", "designation": "description de l'article", "qte": nombre, "pu": prix unitaire HT en nombre}]
Utilise des nombres sans séparateur de milliers ni symbole monétaire (ex: 1250.50). Si aucune ligne n'est trouvée, renvoie [].`

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  try {
    const { files } = await req.json()
    if (!Array.isArray(files) || files.length === 0) {
      return Response.json({ status: 'error', msg: 'Aucun fichier reçu.' }, { status: 400 })
    }

    const parts = files.map((f) => ({ inlineData: { mimeType: f.mime, data: f.base64 } }))
    parts.push({ text: PROMPT })

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts }],
      config: { responseMimeType: 'application/json' },
    })

    const text = (response.text || '[]').replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(text)
    const items = Array.isArray(parsed) ? parsed : parsed.items || []

    return Response.json({ status: 'success', data: items })
  } catch (e) {
    console.error(e)
    return Response.json({ status: 'error', msg: e.message || String(e) }, { status: 500 })
  }
}

export const config = { path: '/api/analyze' }
