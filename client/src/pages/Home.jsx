// TEMPORARY palette/type check page. Replaced by the real sections later.
const colors = [
  ["primary", "bg-primary", "text-white"],
  ["primary-hover", "bg-primary-hover", "text-white"],
  ["primary-deep", "bg-primary-deep", "text-white"],
  ["blush", "bg-blush", "text-ink"],
  ["blush-deep", "bg-blush-deep", "text-ink"],
  ["page", "bg-page", "text-ink"],
  ["surface", "bg-surface", "text-ink"],
  ["line", "bg-line", "text-ink"],
  ["ink", "bg-ink", "text-white"],
  ["muted", "bg-muted", "text-white"],
  ["eyebrow", "bg-eyebrow", "text-white"],
  ["success", "bg-success", "text-white"],
];

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function Home() {
  return (
    <div>
      <section className="bg-blush">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-eyebrow">
            Trendy &bull; Affordable &bull; Everyday Style
          </p>
          <h1 className="mt-3 text-5xl md:text-7xl">
            Fashion Jewellery for Every You
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            Body text in Inter. Headings use Cormorant Garamond.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-sm bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover">
              Shop Now
            </button>
            <button className="rounded-sm border border-primary px-6 py-3 text-sm font-medium text-primary transition-colors hover:bg-blush-deep">
              Explore Collection
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-3xl">Palette</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {colors.map(([name, bg, text]) => (
            <div
              key={name}
              className={`rounded-sm border border-line p-3 ${bg} ${text}`}
            >
              <p className="text-sm font-medium">{name}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-3xl">Product card</h2>
        <div className="mt-6 max-w-[220px] rounded-md border border-line bg-surface p-3">
          <div className="aspect-square rounded-sm bg-blush" />
          <h3 className="mt-3 font-sans text-sm font-medium">
            Multicolor Jhumka Earrings
          </h3>
          <p className="mt-1 text-sm text-muted">
            <span className="text-star" aria-hidden="true">
              &#9733;
            </span>{" "}
            4.6 (1.2K)
          </p>
          <p className="mt-1">
            <span className="font-semibold text-primary">
              {inr.format(199)}
            </span>{" "}
            <span className="text-sm text-muted line-through">
              {inr.format(499)}
            </span>{" "}
            <span className="text-sm font-medium text-success">60% OFF</span>
          </p>
          <button className="mt-3 w-full rounded-sm bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover">
            Add to Cart
          </button>
        </div>
      </section>

      <section className="bg-blush-deep">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-muted">
            Blush-deep banner: muted text 5.91:1
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-eyebrow">
            Eyebrow on blush-deep 5.67:1
          </p>
        </div>
      </section>
    </div>
  );
}
