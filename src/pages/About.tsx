import SlideUp from '@/components/SlideUp';

const About = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-8 text-center">
      <SlideUp>
        <h2 className="font-heading text-3xl font-bold mb-4">About</h2>
      </SlideUp>
      <SlideUp delay={100}>
        <p className="text-muted-foreground max-w-[420px] leading-relaxed">
          osu! better rankings lets you explore performance rankings filtered by continent, excluded countries, and game mode. Built with the official osu! API v2.
        </p>
      </SlideUp>
    </div>
  );
};

export default About;
