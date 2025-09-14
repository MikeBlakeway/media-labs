'use client'

/* eslint-disable @next/next/no-img-element */

export default function ImageTestPage() {
  const testImages = [
    {
      name: 'Red Square (10x10)',
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8/5+hnoEIwDiqkL4KAcT9GO4CHLiAAAAAElFTkSuQmCC'
    },
    {
      name: 'Blue Square (16x16)',
      data: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFUlEQVR42mNkYGAQYQSDNIAAzaQiAAoAAgKAAgKAAgKAAgKA'
    }
  ]

  return (
    <div className='max-w-2xl mx-auto p-6'>
      <h1 className='text-2xl font-bold mb-6'>🧪 Base64 Image Test</h1>

      <div className='space-y-6'>
        {testImages.map((img, index) => (
          <div key={index} className='border rounded-lg p-4'>
            <h3 className='font-medium mb-3'>{img.name}</h3>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {/* Raw img tag */}
              <div>
                <h4 className='text-sm font-medium text-gray-700 mb-2'>Raw &lt;img&gt; tag</h4>
                <div className='border bg-gray-50 p-2 h-24 flex items-center justify-center'>
                  <img
                    src={`data:image/png;base64,${img.data}`}
                    alt={img.name}
                    className='max-w-full max-h-full border'
                  />
                </div>
              </div>

              {/* Scaled version */}
              <div>
                <h4 className='text-sm font-medium text-gray-700 mb-2'>Scaled to 50x50</h4>
                <div className='border bg-gray-50 p-2 h-24 flex items-center justify-center'>
                  <img src={`data:image/png;base64,${img.data}`} alt={img.name} className='w-12 h-12 border' />
                </div>
              </div>

              {/* Object-cover version */}
              <div>
                <h4 className='text-sm font-medium text-gray-700 mb-2'>Object Cover</h4>
                <div className='border bg-gray-50 p-2 h-24 flex items-center justify-center'>
                  <img
                    src={`data:image/png;base64,${img.data}`}
                    alt={img.name}
                    className='w-full h-full object-cover border'
                  />
                </div>
              </div>
            </div>

            <details className='mt-3'>
              <summary className='text-sm text-gray-600 cursor-pointer'>Show base64 data</summary>
              <pre className='text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto'>{img.data}</pre>
            </details>
          </div>
        ))}
      </div>

      <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
        <h3 className='font-medium text-blue-800 mb-2'>✅ Test Results</h3>
        <p className='text-sm text-blue-700'>
          If you can see colored squares above, then base64 images work correctly in your browser. The issue might be
          with the data format or the way we&apos;re handling the images in the main components.
        </p>
      </div>
    </div>
  )
}
