export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Schnittwerk by Vanessa Carosella</h1>
          <p className="mt-2 text-gray-600">Rorschacher Str. 152, 9000 St. Gallen</p>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-4xl font-bold text-gray-900">
            Willkommen bei Ihrem Friseursalon in St. Gallen
          </h2>
          <p className="mb-8 text-xl text-gray-600">
            Professionelle Haarpflege, modernes Styling und persönliche Beratung in entspannter
            Atmosphäre.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-3 text-xl font-semibold">Online Terminbuchung</h3>
              <p className="mb-4 text-gray-600">
                Buchen Sie Ihren Termin bequem online – 24/7 verfügbar
              </p>
              <div className="text-sm text-gray-500">Verfügbar ab Phase 2</div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-3 text-xl font-semibold">Unsere Services</h3>
              <p className="mb-4 text-gray-600">
                Von klassischen Haarschnitten bis zu modernen Colorationen
              </p>
              <div className="text-sm text-gray-500">Verfügbar ab Phase 2</div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-3 text-xl font-semibold">Shop</h3>
              <p className="mb-4 text-gray-600">Hochwertige Haarpflege-Produkte für zu Hause</p>
              <div className="text-sm text-gray-500">Verfügbar ab Phase 3</div>
            </div>
          </div>

          {/* Phase 0 Status */}
          <div className="mt-16 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <h3 className="mb-2 text-lg font-semibold text-blue-900">
              🚀 Phase 0 – Architektur und Fundament
            </h3>
            <p className="text-blue-800">
              Die technische Infrastruktur wird aufgebaut. Monorepo-Struktur, CI/CD Pipeline und
              Basis-Komponenten sind in Arbeit.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 Schnittwerk by Vanessa Carosella. Alle Rechte vorbehalten.</p>
            <div className="mt-4 space-x-4">
              <a href="/privacy" className="hover:underline">
                Datenschutz
              </a>
              <a href="/terms" className="hover:underline">
                AGB
              </a>
              <a href="/contact" className="hover:underline">
                Kontakt
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
