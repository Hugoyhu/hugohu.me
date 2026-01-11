import { ProjectsList } from 'app/components/projects'
import { projects } from './data'

export default function ProjectsPage() {
  return (
    <section>
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Projects</h1>
      <ProjectsList entries={projects} />
    </section>
  )
}
