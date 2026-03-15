import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] text-center px-8">
      <h1 className="font-heading text-[clamp(2.4rem,6vw,4.2rem)] font-bold leading-tight mb-4 max-w-[640px]">
        The definitive web for osu! rankings
      </h1>
      <p className="text-lg text-muted-foreground max-w-[480px] mb-8 leading-relaxed">
        Filter global rankings by continent, country exclusions and game mode. Find out where players from your region truly stand.
      </p>
      <button
        onClick={() => navigate('/rankings')}
        className="bg-primary text-primary-foreground rounded-full px-9 py-3 font-bold cursor-pointer transition-all shadow-[0_4px_15px_hsl(var(--primary)/0.4)] hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_hsl(var(--primary)/0.5)]"
      >
        Explore Rankings →
      </button>
    </div>
  );
};

export default Index;
