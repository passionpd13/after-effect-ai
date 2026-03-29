interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  items: string[];
  color: string;
}

export default function FeatureCard({ icon, title, description, items, color }: FeatureCardProps) {
  return (
    <div className="card-glass p-6 hover:border-white/20 transition-all group">
      <div className={`text-3xl mb-4 w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-white/60 text-sm mb-4">{description}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/70 border border-white/10"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
