import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request) {
  try {
    const data = await request.formData()
    const file = data.get('file')
    if (!file) return new Response(JSON.stringify({ message: 'No file' }), { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    const res = await cloudinary.uploader.upload(base64, { folder: 'traceback/reports' })
    return new Response(JSON.stringify({ url: res.secure_url, public_id: res.public_id }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ message: err.message }), { status: 500 })
  }
}
