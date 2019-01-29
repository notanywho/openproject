import {Injectable} from "@angular/core";
import {from, Observable} from "rxjs";
import {BoardListsService} from "core-app/modules/boards/board/board-list/board-lists.service";
import {HalResourceService} from "core-app/modules/hal/services/hal-resource.service";
import {PathHelperService} from "core-app/modules/common/path-helper/path-helper.service";
import {GridDmService} from "core-app/modules/hal/dm-services/grid-dm.service";
import {CurrentProjectService} from "core-components/projects/current-project.service";
import {GridResource} from "core-app/modules/hal/resources/grid-resource";
import {map} from "rxjs/operators";
import {Board} from "core-app/modules/boards/board/board";

@Injectable()
export class BoardService {

  constructor(protected GridDm:GridDmService,
              protected PathHelper:PathHelperService,
              protected CurrentProject:CurrentProjectService,
              protected halResourceService:HalResourceService,
              protected BoardsList:BoardListsService) {
  }

  /**
   * Return all boards in the current scope of the project
   *
   * @param projectIdentifier
   */
  public allInScope(projectIdentifier:string|null = this.CurrentProject.identifier) {
    const path = this.boardPath(projectIdentifier);

    return from(
        this.GridDm.list({ filters: [['page', '=', [path]]] })
      )
      .pipe(
        map(collection => collection.elements.map(grid => new Board(grid, 'Board name')))
      );
  }

  /**
   * Load one board based on ID
   */
  public one(id:number):Observable<Board> {
    return from(this.GridDm.one(id))
      .pipe(
        map(grid => new Board(grid, 'Board name'))
      );
  }

  /**
   * Save the changes to the board
   */
  public save(board:Board) {
    return this.fetchSchema(board)
      .then(schema => this.GridDm.update(board.grid, schema))
      .then(grid => {
        board.grid = grid;
        return board;
      });
  }

  private fetchSchema(board:Board) {
    return this.GridDm.updateForm(board.grid)
      .then((form) => form.schema);
  }

  /**
   * Retrieve the board path identifier for looking up grids.
   *
   * @param projectIdentifier The current project identifier
   */
  public boardPath(projectIdentifier:string|null = this.CurrentProject.identifier) {
    return '/boards'; // this.PathHelper.projectBoardsPath(projectIdentifier);
  }

  /**
   * Create a new board
   * @param name
   */
  public async create(name:string = 'New board'):Promise<Board> {
    const grid = await this.createGrid();
    const board = new Board(grid, name);

    await this.BoardsList.addQuery(board);

    return board;
  }


  private createGrid():Promise<GridResource> {
    const path = this.boardPath();
    let payload = _.set({}, '_links.page.href', path);

    return this.GridDm
      .createForm(payload)
      .then((form) => {
        let resource = this.halResourceService.createHalResource<GridResource>(form.payload.$source);
        return this.GridDm.create(resource, form.schema);
      });
  }
}