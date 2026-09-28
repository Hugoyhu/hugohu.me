import { BlogPosts } from "app/components/posts";

export default function Page() {
  return (
    <div className="max-w-xl mt-8 mx-auto">
      <section>
        <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
          Hugo Hu
        </h1>
        {/* <p className="mb-4">
          {`Hi! I'm a senior at Stuyvesant High School in New York City, and I'm an incoming 
          first-year to the State University of New York at Stony Brook, where I will pursue
          a double major in Computer Science (Honors) and Applied Math & Statistics, with a minor in 
          Political Science. I'll also be a member of the Honors College.
          In my free time, I love photography, cooking, and PCB design. `}
        </p> */}
        <p className="mb-4">
          {`Hello! I'm a first-year undergraduate at Stony Brook University, and I'm pursuing a B.S. in Computer Science within the Honors in Computer Science program. 
          I'm also pursuing a second major in Applied Math and Statistics, and a minor in Political Science. I'm also a member of the Honors College at Stony Brook. 
          `}
        </p>
        <p className="mb-4">
          {`Currently, I work for Stony Brook Campus Residences as an IT / Programming Intern. Previously, I've conducted research at MSKCC on machine learning
        models performing CNN-based deformable image registration. I've also worked for Hack Club as a
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
