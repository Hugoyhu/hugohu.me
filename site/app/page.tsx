import { BlogPosts } from "app/components/posts";

export default function Page() {
  return (
    <div className="max-w-xl mt-8 mx-auto">
      <section>
        <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
          Hugo Hu
        </h1>
        <p className="mb-4">
          {`Hi! I'm a senior at Stuyvesant High School in New York City. I'm passionate about
        photography and cooking, and I shoot for my school's newspaper and yearbook. I'm also 
        a part of Stuyvesant's math team. `}
        </p>
        <p className="mb-4">
          {`Previously, I've conducted research at MSKCC on machine learning
        models performing deformable image registration. I've also worked for Hack Club as a
        hardware engineering and logistics intern, designing PCBs for CNC plotting machines and
        handheld game consoles.`}
        </p>
        {/* <div className="my-8">
          <BlogPosts />
        </div> */}
      </section>
    </div>
  );
}
