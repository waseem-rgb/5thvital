import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Award, Clock, Users, Target, Microscope } from "lucide-react";

const AboutSection = () => {
  const stats = [
    {
      icon: Users,
      value: "50K+",
      label: "Patients Served",
      description: "Trust us with their health"
    },
    {
      icon: Award,
      value: "99.2%",
      label: "Accuracy Rate",
      description: "Industry-leading precision"
    },
    {
      icon: Clock,
      value: "< 24h",
      label: "Average Results",
      description: "Faster than industry standard"
    },
    {
      icon: Shield,
      value: "ISO 15189",
      label: "Certified Lab",
      description: "International quality standards"
    }
  ];

  const values = [
    {
      icon: Target,
      title: "Precision",
      description: "Every test is performed with meticulous attention to detail using state-of-the-art equipment."
    },
    {
      icon: Shield,
      title: "Trust",
      description: "Your health data is completely secure and handled with the highest level of confidentiality."
    },
    {
      icon: Microscope,
      title: "Innovation",
      description: "We continuously invest in the latest medical technology to provide the most accurate results."
    }
  ];

  return (
    <section className="py-20 bg-section-gradient" id="about">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <div className="w-2 h-2 bg-accent rounded-full" />
              <div className="w-2 h-2 bg-medical-blue rounded-full" />
            </div>
            <span className="text-primary font-semibold uppercase tracking-wide text-sm">
              About PredLabs
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Excellence in diagnostics,
            <br />
            <span className="text-primary">trusted by thousands</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            We are committed to providing accurate, timely, and reliable diagnostic services 
            that empower individuals to make informed decisions about their health.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center hover:shadow-card-medical transition-all duration-300">
              <CardContent className="pt-8 pb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="font-semibold text-foreground mb-1">{stat.label}</div>
                <div className="text-sm text-muted-foreground">{stat.description}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
          {/* Text Content */}
          <div>
            <h3 className="text-3xl font-bold text-foreground mb-6">
              The most advanced laboratory
              <br />
              technology meets human care
            </h3>
            <div className="space-y-6 text-muted-foreground">
              <p className="leading-relaxed">
                Nearly <span className="text-primary font-semibold">90% of medical decisions</span> are based on 
                laboratory test results. That's why we've invested in the most advanced diagnostic equipment 
                and rigorous quality control processes to ensure every result is accurate and reliable.
              </p>
              <p className="leading-relaxed">
                With a platform that combines cutting-edge technology with expert medical oversight, 
                PredLabs is setting new standards in diagnostic medicine. We're putting advanced healthcare 
                insights into the hands of patients and healthcare providers alike.
              </p>
            </div>
            <Button size="lg" className="mt-8 font-semibold">
              Learn More About Our Process
            </Button>
          </div>

          {/* Image/Visual Content */}
          <div className="relative">
            <div className="aspect-square bg-hero-gradient rounded-3xl relative overflow-hidden">
              {/* Abstract shapes and elements */}
              <div className="absolute inset-0 bg-hero-overlay">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/20 rounded-full blur-xl" />
                <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-accent/30 rounded-full blur-lg" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Microscope className="h-32 w-32 text-white/40" />
                </div>
              </div>
            </div>
            
            {/* Floating stats */}
            <div className="absolute -top-4 -right-4 bg-white rounded-xl p-4 shadow-card-medical">
              <div className="text-2xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">Service</div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-4 shadow-card-medical">
              <div className="text-2xl font-bold text-accent">4X</div>
              <div className="text-sm text-muted-foreground">Faster</div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <div key={index} className="text-center">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <value.icon className="h-10 w-10 text-accent" />
              </div>
              <h4 className="text-xl font-bold text-foreground mb-4">{value.title}</h4>
              <p className="text-muted-foreground leading-relaxed">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;